const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function generateRefreshTokenRaw() {
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Access JWT — `sub` da userId, `role` da rol.
 * Rolni JWTda saqlab, har so'rovda DB query'siz tekshiramiz.
 */
function signAccessToken(user, env) {
  return jwt.sign({ role: user.role || 'USER' }, env.jwtAccessSecret, {
    subject: user.id,
    expiresIn: `${env.accessTokenExpiresMinutes}m`,
  });
}

module.exports = {
  hashRefreshToken,
  generateRefreshTokenRaw,
  signAccessToken,
};
