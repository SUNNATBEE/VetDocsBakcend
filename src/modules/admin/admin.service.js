const { prisma } = require('../../infrastructure/database/prisma.client');
const { createHttpError } = require('../../common/errors/httpError');

function clinicOut(c) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    city: c.city,
    latitude: c.latitude,
    longitude: c.longitude,
    openingHours: c.openingHours || null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    reviewCount: c._count?.reviews,
  };
}

function userOut(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
    reviewCount: u._count?.reviews,
  };
}

function reviewOut(r) {
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt,
    clinic: r.clinic ? { id: r.clinic.id, name: r.clinic.name } : null,
    user: r.user
      ? { id: r.user.id, email: r.user.email, name: r.user.name }
      : null,
  };
}

function paginate(page, pageSize) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

// ───────── DASHBOARD ─────────
async function dashboard() {
  const [users, clinics, reviews, latestReviews] = await Promise.all([
    prisma.user.count(),
    prisma.clinic.count(),
    prisma.review.count(),
    prisma.review.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        clinic: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    }),
  ]);
  return {
    counts: { users, clinics, reviews },
    latestReviews: latestReviews.map(reviewOut),
  };
}

// ───────── CLINICS ─────────
async function listClinics({ page, pageSize, q }) {
  const where = q
    ? {
        OR: [
          { name: { contains: q } },
          { city: { contains: q } },
          { address: { contains: q } },
        ],
      }
    : {};
  const [total, items] = await Promise.all([
    prisma.clinic.count({ where }),
    prisma.clinic.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...paginate(page, pageSize),
      include: { _count: { select: { reviews: true } } },
    }),
  ]);
  return { total, page, pageSize, items: items.map(clinicOut) };
}

async function getClinic(id) {
  const c = await prisma.clinic.findUnique({
    where: { id },
    include: { _count: { select: { reviews: true } } },
  });
  if (!c) throw createHttpError(404, 'Klinika topilmadi', { code: 'CLINIC_NOT_FOUND' });
  return clinicOut(c);
}

async function createClinic(data) {
  const created = await prisma.clinic.create({
    data: {
      name: data.name,
      phone: data.phone,
      address: data.address,
      city: data.city,
      latitude: data.latitude,
      longitude: data.longitude,
      openingHours: data.openingHours,
    },
    include: { _count: { select: { reviews: true } } },
  });
  return clinicOut(created);
}

async function updateClinic(id, data) {
  const exists = await prisma.clinic.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw createHttpError(404, 'Klinika topilmadi', { code: 'CLINIC_NOT_FOUND' });

  const patch = {};
  for (const k of ['name', 'phone', 'address', 'city', 'latitude', 'longitude']) {
    if (data[k] !== undefined) patch[k] = data[k];
  }
  if (data.openingHours !== undefined) {
    patch.openingHours = data.openingHours;
  }

  const updated = await prisma.clinic.update({
    where: { id },
    data: patch,
    include: { _count: { select: { reviews: true } } },
  });
  return clinicOut(updated);
}

async function deleteClinic(id) {
  try {
    await prisma.clinic.delete({ where: { id } });
  } catch (err) {
    if (err && err.code === 'P2025') {
      throw createHttpError(404, 'Klinika topilmadi', { code: 'CLINIC_NOT_FOUND' });
    }
    throw err;
  }
  return { ok: true };
}

// ───────── REVIEWS ─────────
async function listReviews({ page, pageSize, q }) {
  const where = q
    ? {
        OR: [
          { comment: { contains: q } },
          { clinic: { name: { contains: q } } },
          { user: { email: { contains: q } } },
        ],
      }
    : {};
  const [total, items] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...paginate(page, pageSize),
      include: {
        clinic: { select: { id: true, name: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    }),
  ]);
  return { total, page, pageSize, items: items.map(reviewOut) };
}

async function deleteReview(id) {
  try {
    await prisma.review.delete({ where: { id } });
  } catch (err) {
    if (err && err.code === 'P2025') {
      throw createHttpError(404, 'Sharh topilmadi', { code: 'REVIEW_NOT_FOUND' });
    }
    throw err;
  }
  return { ok: true };
}

// ───────── USERS ─────────
async function listUsers({ page, pageSize, q }) {
  const where = q
    ? {
        OR: [
          { email: { contains: q } },
          { name: { contains: q } },
        ],
      }
    : {};
  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...paginate(page, pageSize),
      include: { _count: { select: { reviews: true } } },
    }),
  ]);
  return { total, page, pageSize, items: items.map(userOut) };
}

async function updateUserRole({ id, role, actorId }) {
  if (id === actorId && role !== 'ADMIN') {
    throw createHttpError(400, 'O‘zingizdan ADMIN rolini olib tashlay olmaysiz', {
      code: 'CANNOT_DEMOTE_SELF',
    });
  }
  const exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw createHttpError(404, 'Foydalanuvchi topilmadi', { code: 'USER_NOT_FOUND' });
  const updated = await prisma.user.update({
    where: { id },
    data: { role },
    include: { _count: { select: { reviews: true } } },
  });
  return userOut(updated);
}

async function deleteUser({ id, actorId }) {
  if (id === actorId) {
    throw createHttpError(400, 'O‘zingizni o‘chira olmaysiz', { code: 'CANNOT_DELETE_SELF' });
  }
  try {
    await prisma.user.delete({ where: { id } });
  } catch (err) {
    if (err && err.code === 'P2025') {
      throw createHttpError(404, 'Foydalanuvchi topilmadi', { code: 'USER_NOT_FOUND' });
    }
    throw err;
  }
  return { ok: true };
}

module.exports = {
  dashboard,
  listClinics,
  getClinic,
  createClinic,
  updateClinic,
  deleteClinic,
  listReviews,
  deleteReview,
  listUsers,
  updateUserRole,
  deleteUser,
};
