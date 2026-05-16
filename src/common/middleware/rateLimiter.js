const rateLimit = require('express-rate-limit');

function buildLimitResponse(code, message) {
  return (req, res) => {
    res.status(429).json({
      success: false,
      error: { code, message },
      meta: { requestId: req.requestId || null },
    });
  };
}

function globalLimiter(env) {
  return rateLimit({
    windowMs: env.rateLimitWindowMinutes * 60 * 1000,
    max: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) =>
      req.path === '/' ||
      req.path === '/favicon.ico' ||
      req.path.startsWith('/docs'),
    handler: buildLimitResponse(
      'RATE_LIMIT',
      'Juda ko‘p so‘rov. Keyinroq urinib ko‘ring.',
    ),
  });
}

function authLimiter(env) {
  return rateLimit({
    windowMs: env.authRateLimitWindowMinutes * 60 * 1000,
    max: env.authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    handler: buildLimitResponse(
      'AUTH_RATE_LIMIT',
      'Autentifikatsiya urinishlari cheklangan. Keyinroq urinib ko‘ring.',
    ),
  });
}

/** Faqat `?address=` bilan kelgan yaqin qidiruv (tashqi geokod) */
function geocodeNearbyLimiter(env) {
  return rateLimit({
    windowMs: env.geocodeRateLimitWindowMinutes * 60 * 1000,
    max: env.geocodeRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      const q = req.query?.address;
      return typeof q !== 'string' || q.trim().length < 3;
    },
    handler: buildLimitResponse(
      'GEOCODE_RATE_LIMIT',
      'Manzil qidiruvlari juda ko‘p. Bir ozdan keyin urinib ko‘ring.',
    ),
  });
}

module.exports = { globalLimiter, authLimiter, geocodeNearbyLimiter };
