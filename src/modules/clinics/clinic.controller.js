const clinicService = require('./clinic.service');

async function nearby(req, res) {
  const list = await clinicService.listNearby(req.validated.query);
  res.status(200).json({ success: true, data: { clinics: list } });
}

async function detail(req, res) {
  const data = await clinicService.getById(req.validated.params.id);
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

module.exports = { nearby, detail, createReview };
