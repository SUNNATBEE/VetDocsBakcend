const express = require('express');
const { asyncHandler } = require('../../common/middleware/asyncHandler');
const { requireAuth, requireRole } = require('../../common/middleware/requireAuth');
const { validate } = require('../../common/middleware/validate');
const adminController = require('./admin.controller');
const {
  clinicCreateSchema,
  clinicUpdateSchema,
  idParamSchema,
  listQuerySchema,
  userRoleUpdateSchema,
} = require('./admin.validation');

function createAdminRouter(env) {
  const router = express.Router();

  router.use(requireAuth(env), requireRole('ADMIN'));

  router.get('/dashboard', asyncHandler(adminController.dashboard));

  // Clinics
  router.get(
    '/clinics',
    validate(listQuerySchema, 'query'),
    asyncHandler(adminController.listClinics),
  );
  router.post(
    '/clinics',
    validate(clinicCreateSchema, 'body'),
    asyncHandler(adminController.createClinic),
  );
  router.get(
    '/clinics/:id',
    validate(idParamSchema, 'params'),
    asyncHandler(adminController.getClinic),
  );
  router.patch(
    '/clinics/:id',
    validate(idParamSchema, 'params'),
    validate(clinicUpdateSchema, 'body'),
    asyncHandler(adminController.updateClinic),
  );
  router.delete(
    '/clinics/:id',
    validate(idParamSchema, 'params'),
    asyncHandler(adminController.deleteClinic),
  );

  // Reviews
  router.get(
    '/reviews',
    validate(listQuerySchema, 'query'),
    asyncHandler(adminController.listReviews),
  );
  router.delete(
    '/reviews/:id',
    validate(idParamSchema, 'params'),
    asyncHandler(adminController.deleteReview),
  );

  // Users
  router.get(
    '/users',
    validate(listQuerySchema, 'query'),
    asyncHandler(adminController.listUsers),
  );
  router.patch(
    '/users/:id/role',
    validate(idParamSchema, 'params'),
    validate(userRoleUpdateSchema, 'body'),
    asyncHandler(adminController.updateUserRole),
  );
  router.delete(
    '/users/:id',
    validate(idParamSchema, 'params'),
    asyncHandler(adminController.deleteUser),
  );

  return router;
}

module.exports = { createAdminRouter };
