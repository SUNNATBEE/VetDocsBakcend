const clinicService = require('./clinic.service');
const { geocodeAddress } = require('../../common/utils/geocode');
const { buildClinicWeakEtag, ifNoneMatchEquals } = require('../../common/utils/httpCache');
const { TASHKENT_DISTRICTS } = require('./clinic.constants');

async function nearby(req, res) {
  const q = req.validated.query;

  if (q.address) {
    const { lat, lng } = await geocodeAddress(q.address, req.env, { requestId: req.requestId });
    const list = await clinicService.listNearby({
      lat,
      lng,
      radiusKm: q.radiusKm,
      district: q.district,
    });
    return res.status(200).json({
      success: true,
      data: {
        clinics: list,
        searchCenter: { lat, lng, query: q.address, district: q.district || null },
      },
    });
  }

  let lat = q.lat;
  let lng = q.lng;
  // district berilgan, lekin lat/lng yo'q — tuman markazidan qidiramiz.
  if ((lat === undefined || lng === undefined) && q.district) {
    const center = TASHKENT_DISTRICTS.find((d) => d.key === q.district);
    if (center) {
      lat = center.lat;
      lng = center.lng;
    }
  }

  const list = await clinicService.listNearby({
    lat,
    lng,
    radiusKm: q.radiusKm,
    district: q.district,
  });
  res.status(200).json({
    success: true,
    data: {
      clinics: list,
      searchCenter: { lat, lng, district: q.district || null },
    },
  });
}

async function districts(_req, res) {
  const list = await clinicService.listDistricts();
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({ success: true, data: { districts: list } });
}

async function detail(req, res) {
  const data = await clinicService.getById(req.validated.params.id);
  const etag = buildClinicWeakEtag(data.id, data.updatedAt);
  res.setHeader('Cache-Control', 'private, no-cache');
  res.setHeader('ETag', etag);
  if (ifNoneMatchEquals(req.get('If-None-Match'), etag)) {
    return res.status(304).end();
  }
  res.status(200).json({ success: true, data });
}

async function createReview(req, res) {
  const review = await clinicService.upsertReview({
    clinicId: req.validated.params.id,
    userId: req.user.id,
    rating: req.validated.body.rating,
    comment: req.validated.body.comment,
  });
  res.status(201).json({ success: true, data: review });
}

module.exports = { nearby, detail, createReview, districts };
