const jwt = require('jsonwebtoken');
const { createHttpError } = require('../errors/httpError');

function extractBearer(headerValue) {
  if (typeof headerValue !== 'string') return null;
  const [scheme, token] = headerValue.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null;
  return token.trim() || null;
}

function requireAuth(env) {
  return (req, _res, next) => {
    const token = extractBearer(req.headers.authorization);
    if (!token) {
      return next(
        createHttpError(401, 'Access token talab qilinadi', { code: 'UNAUTHORIZED' }),
      );
    }
    try {
      const payload = jwt.verify(token, env.jwtAccessSecret);
      if (!payload || typeof payload.sub !== 'string') {
        return next(createHttpError(401, 'Access token noto‘g‘ri', { code: 'INVALID_TOKEN' }));
      }
      req.user = {
        id: payload.sub,
        role: payload.role || 'USER',
      };
      return next();
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return next(
          createHttpError(401, 'Access token muddati tugagan', { code: 'TOKEN_EXPIRED' }),
        );
      }
      return next(createHttpError(401, 'Access token noto‘g‘ri', { code: 'INVALID_TOKEN' }));
    }
  };
}

function requireRole(...allowedRoles) {
  const roles = new Set(allowedRoles.map(String));
  return (req, _res, next) => {
    if (!req.user) {
      return next(createHttpError(401, 'Avval autentifikatsiya', { code: 'UNAUTHORIZED' }));
    }
    if (!roles.has(req.user.role)) {
      return next(createHttpError(403, 'Ruxsat yo‘q', { code: 'FORBIDDEN' }));
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
