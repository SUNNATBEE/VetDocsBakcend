const bcrypt = require('bcryptjs');
const { prisma } = require('../../infrastructure/database/prisma.client');
const { createHttpError } = require('../../common/errors/httpError');
const {
  hashRefreshToken,
  generateRefreshTokenRaw,
  signAccessToken,
} = require('./token.service');

const SALT_ROUNDS = 12;

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role || 'USER',
  };
}

function refreshExpiryDate(env) {
  return new Date(Date.now() + env.refreshTokenExpiresDays * 24 * 60 * 60 * 1000);
}

async function issueRefreshToken(userId, env, tx = prisma) {
  const raw = generateRefreshTokenRaw();
  await tx.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(raw),
      userId,
      expiresAt: refreshExpiryDate(env),
    },
  });
  return raw;
}

async function revokeAllUserSessions(userId, tx = prisma) {
  await tx.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

async function register({ email, password, name }, env) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  let user;
  try {
    user = await prisma.user.create({
      data: { email, passwordHash, name: name || null },
    });
  } catch (err) {
    if (err && err.code === 'P2002') {
      throw createHttpError(409, 'Bu email allaqachon ro‘yxatdan o‘tgan', {
        code: 'EMAIL_EXISTS',
      });
    }
    throw err;
  }

  const accessToken = signAccessToken(user, env);
  const refreshToken = await issueRefreshToken(user.id, env);

  return { user: publicUser(user), accessToken, refreshToken };
}

async function login({ email, password }, env) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Bir xil javob — email mavjudligini sezdirmaslik uchun
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) {
    throw createHttpError(401, 'Email yoki parol noto‘g‘ri', { code: 'INVALID_CREDENTIALS' });
  }

  const accessToken = signAccessToken(user, env);
  const refreshToken = await issueRefreshToken(user.id, env);
  return { user: publicUser(user), accessToken, refreshToken };
}

async function refresh({ refreshToken: raw }, env) {
  const tokenHash = hashRefreshToken(raw);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!record) {
    throw createHttpError(401, 'Refresh token noto‘g‘ri', { code: 'INVALID_REFRESH' });
  }

  // O‘g‘irlash aniqlash: agar bekor qilingan token qaytadan ishlatilsa,
  // foydalanuvchining hamma faol sessiyalarini bekor qilamiz.
  if (record.revokedAt) {
    await revokeAllUserSessions(record.userId);
    throw createHttpError(401, 'Refresh token allaqachon ishlatilgan', {
      code: 'REFRESH_REUSED',
    });
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw createHttpError(401, 'Refresh token muddati tugagan', { code: 'REFRESH_EXPIRED' });
  }

  const newRaw = generateRefreshTokenRaw();
  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        tokenHash: hashRefreshToken(newRaw),
        userId: record.userId,
        expiresAt: refreshExpiryDate(env),
      },
    }),
  ]);

  const accessToken = signAccessToken(record.user, env);
  return {
    user: publicUser(record.user),
    accessToken,
    refreshToken: newRaw,
  };
}

async function logout({ refreshToken: raw }) {
  if (!raw) return { ok: true };
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(raw), revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { ok: true };
}

module.exports = {
  register,
  login,
  refresh,
  logout,
};
