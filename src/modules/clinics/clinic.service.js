const { prisma } = require('../../infrastructure/database/prisma.client');
const { createHttpError } = require('../../common/errors/httpError');
const { distanceKm } = require('../../common/utils/haversine');
const { isOpenNow } = require('../../common/utils/openingHours');

const REVIEW_LIST_LIMIT = 50;

function maskEmail(email) {
  if (!email || typeof email !== 'string') return '***';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

function publicReview(review) {
  return {
    id: review.id,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
    user: {
      id: review.user.id,
      name: review.user.name,
      email: maskEmail(review.user.email),
    },
  };
}

function averageRating(ratings) {
  if (!ratings.length) return null;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

async function listNearby({ lat, lng, radiusKm }) {
  const clinics = await prisma.clinic.findMany({
    include: { reviews: { select: { rating: true } } },
  });

  return clinics
    .map((c) => {
      const distance = distanceKm(lat, lng, c.latitude, c.longitude);
      const status = isOpenNow(c.openingHours);
      const todayHours = c.openingHours && status.dayKey ? c.openingHours[status.dayKey] || null : null;
      const ratings = c.reviews.map((r) => r.rating);

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        city: c.city,
        latitude: c.latitude,
        longitude: c.longitude,
        distanceKm: Math.round(distance * 100) / 100,
        isOpenNow: status.open,
        todayHours,
        averageRating: averageRating(ratings),
        reviewCount: ratings.length,
      };
    })
    .filter((c) => c.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

async function getById(id) {
  const clinic = await prisma.clinic.findUnique({
    where: { id },
    include: {
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: REVIEW_LIST_LIMIT,
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  if (!clinic) {
    throw createHttpError(404, 'Klinika topilmadi', { code: 'CLINIC_NOT_FOUND' });
  }

  const status = isOpenNow(clinic.openingHours);
  const ratings = clinic.reviews.map((r) => r.rating);
  const todayHours =
    clinic.openingHours && status.dayKey ? clinic.openingHours[status.dayKey] || null : null;

  return {
    id: clinic.id,
    name: clinic.name,
    phone: clinic.phone,
    address: clinic.address,
    city: clinic.city,
    latitude: clinic.latitude,
    longitude: clinic.longitude,
    openingHours: clinic.openingHours,
    todayHours,
    isOpenNow: status.open,
    averageRating: averageRating(ratings),
    reviewCount: ratings.length,
    reviews: clinic.reviews.map(publicReview),
  };
}

async function upsertReview({ clinicId, userId, rating, comment }) {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: { id: true },
  });
  if (!clinic) {
    throw createHttpError(404, 'Klinika topilmadi', { code: 'CLINIC_NOT_FOUND' });
  }

  const data = {
    rating,
    comment: comment && comment.length > 0 ? comment : null,
  };

  const review = await prisma.review.upsert({
    where: { clinicId_userId: { clinicId, userId } },
    update: data,
    create: { clinicId, userId, ...data },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  return publicReview(review);
}

module.exports = {
  listNearby,
  getById,
  upsertReview,
};
