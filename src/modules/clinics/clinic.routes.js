const express = require('express');
const { asyncHandler } = require('../../common/middleware/asyncHandler');
const { requireAuth } = require('../../common/middleware/requireAuth');
const { validate } = require('../../common/middleware/validate');
const { geocodeNearbyLimiter } = require('../../common/middleware/rateLimiter');
const clinicController = require('./clinic.controller');
const {
  nearbyQuerySchema,
  clinicIdParamsSchema,
  reviewBodySchema,
} = require('./clinic.validation');

function createClinicRouter(env) {
  const router = express.Router();
  const auth = requireAuth(env);

  router.get(
    '/nearby',
    geocodeNearbyLimiter(env),
    validate(nearbyQuerySchema, 'query'),
    asyncHandler(clinicController.nearby),
  );
  router.get('/districts', asyncHandler(clinicController.districts));
  router.get(
    '/:id',
    validate(clinicIdParamsSchema, 'params'),
    asyncHandler(clinicController.detail),
  );
  router.post(
    '/:id/reviews',
    auth,
    validate(clinicIdParamsSchema, 'params'),
    validate(reviewBodySchema, 'body'),
    asyncHandler(clinicController.createReview),
  );

  return router;
}

module.exports = { createClinicRouter };
