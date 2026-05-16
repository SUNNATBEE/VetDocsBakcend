const express = require('express');
const { createAuthRouter } = require('../modules/auth/auth.routes');
const { createClinicRouter } = require('../modules/clinics/clinic.routes');
const { createHealthRouter } = require('../modules/health/health.routes');
const { createAdminRouter } = require('../modules/admin/admin.routes');

function createV1Router(env) {
  const router = express.Router();

  router.use('/health', createHealthRouter(env));
  router.use('/auth', createAuthRouter(env));
  router.use('/clinics', createClinicRouter(env));
  router.use('/admin', createAdminRouter(env));

  // Public client-config — /map sahifasi Google Maps brauzer kalitini bu yerdan oladi.
  router.get('/config/public', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json({
      success: true,
      data: {
        googleMapsBrowserKey: req.env.googleMapsBrowserKey || null,
      },
    });
  });

  return router;
}

module.exports = { createV1Router };
