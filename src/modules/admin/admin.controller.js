const adminService = require('./admin.service');

async function dashboard(_req, res) {
  res.json({ success: true, data: await adminService.dashboard() });
}

// clinics
async function listClinics(req, res) {
  res.json({ success: true, data: await adminService.listClinics(req.validated.query) });
}
async function getClinic(req, res) {
  res.json({ success: true, data: await adminService.getClinic(req.validated.params.id) });
}
async function createClinic(req, res) {
  const data = await adminService.createClinic(req.validated.body);
  res.status(201).json({ success: true, data });
}
async function updateClinic(req, res) {
  const data = await adminService.updateClinic(req.validated.params.id, req.validated.body);
  res.json({ success: true, data });
}
async function deleteClinic(req, res) {
  res.json({ success: true, data: await adminService.deleteClinic(req.validated.params.id) });
}

// reviews
async function listReviews(req, res) {
  res.json({ success: true, data: await adminService.listReviews(req.validated.query) });
}
async function deleteReview(req, res) {
  res.json({ success: true, data: await adminService.deleteReview(req.validated.params.id) });
}

// users
async function listUsers(req, res) {
  res.json({ success: true, data: await adminService.listUsers(req.validated.query) });
}
async function updateUserRole(req, res) {
  const data = await adminService.updateUserRole({
    id: req.validated.params.id,
    role: req.validated.body.role,
    actorId: req.user.id,
  });
  res.json({ success: true, data });
}
async function deleteUser(req, res) {
  const data = await adminService.deleteUser({
    id: req.validated.params.id,
    actorId: req.user.id,
  });
  res.json({ success: true, data });
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
