const express = require('express');
const { asyncHandler } = require('../../common/middleware/asyncHandler');
const { authLimiter } = require('../../common/middleware/rateLimiter');
const { validate } = require('../../common/middleware/validate');
const authController = require('./auth.controller');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} = require('./auth.validation');

function createAuthRouter(env) {
  const router = express.Router();
  const limit = authLimiter(env);

  router.post('/register', limit, validate(registerSchema), asyncHandler(authController.register));
  router.post('/login', limit, validate(loginSchema), asyncHandler(authController.login));
  router.post('/refresh', limit, validate(refreshSchema), asyncHandler(authController.refresh));
  router.post('/logout', limit, validate(logoutSchema), asyncHandler(authController.logout));

  return router;
}

module.exports = { createAuthRouter };
