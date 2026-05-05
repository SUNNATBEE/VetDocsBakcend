require('dotenv').config();

const REQUIRED_KEYS = ['JWT_ACCESS_SECRET', 'DATABASE_URL'];
const PLACEHOLDER_SECRETS = new Set([
  'ozgartiring-uzun-tasodifiy-maxfiy-kalit',
  'change-me',
  'secret',
  'REPLACE-WITH-STRONG-RANDOM-32+chars',
  'dev-only-CHANGE-ME-replace-with-strong-random-32+chars',
  '',
]);

function bool(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function int(value, defaultValue) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : defaultValue;
}

function parseCorsOrigin(raw, isProduction) {
  if (!raw || raw === '*') {
    if (isProduction) {
      throw new Error(
        'Productionda CORS_ORIGIN="*" taqiqlanadi. Aniq frontend domen(lar)ini ko\'rsating.',
      );
    }
    return true;
  }
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length === 1 ? list[0] : list;
}

function loadEnv() {
  const missing = REQUIRED_KEYS.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Yetishmagan muhit o'zgaruvchilari: ${missing.join(', ')}. .env.example dan nusxa oling.`,
    );
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;

  if (PLACEHOLDER_SECRETS.has(jwtAccessSecret) || jwtAccessSecret.length < 32) {
    const message =
      'JWT_ACCESS_SECRET zaif yoki standart qiymatda. Kuchli tasodifiy 32+ belgili kalit qo\'ying ' +
      '(node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))").';
    if (isProduction) {
      throw new Error(message);
    }
    // eslint-disable-next-line no-console
    console.warn(`[env] OGOHLANTIRISH: ${message}`);
  }

  if (isProduction && !process.env.DATABASE_DIRECT_URL) {
    // eslint-disable-next-line no-console
    console.warn(
      '[env] OGOHLANTIRISH: Productionda DATABASE_DIRECT_URL tavsiya etiladi ' +
        '(Prisma migratsiyalari pooler orqali ishlamaydi).',
    );
  }

  const port = int(process.env.PORT, 4000);
  const railwayUrl =
    process.env.RAILWAY_STATIC_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '');
  const apiPublicUrl = (process.env.API_PUBLIC_URL || railwayUrl || `http://localhost:${port}`).replace(
    /\/+$/,
    '',
  );
  const swaggerUsername = process.env.SWAGGER_USERNAME || '';
  const swaggerPassword = process.env.SWAGGER_PASSWORD || '';

  if (isProduction && bool(process.env.ENABLE_SWAGGER, !isProduction)) {
    if (!swaggerUsername || !swaggerPassword) {
      throw new Error(
        "ENABLE_SWAGGER=true bo'lganda productionda SWAGGER_USERNAME va SWAGGER_PASSWORD majburiy.",
      );
    }
  }

  return {
    nodeEnv,
    isProduction,
    port,
    databaseUrl: process.env.DATABASE_URL,
    jwtAccessSecret,
    accessTokenExpiresMinutes: int(process.env.ACCESS_TOKEN_EXPIRES_MINUTES, 15),
    refreshTokenExpiresDays: int(process.env.REFRESH_TOKEN_EXPIRES_DAYS, 14),
    corsOrigin: parseCorsOrigin(process.env.CORS_ORIGIN || 'http://localhost:3000', isProduction),
    apiPrefix: '/api/v1',
    apiPublicUrl,
    enableSwagger: bool(process.env.ENABLE_SWAGGER, !isProduction),
    swaggerUsername,
    swaggerPassword,
    trustProxy: bool(process.env.TRUST_PROXY, isProduction),
    rateLimitWindowMinutes: int(process.env.RATE_LIMIT_WINDOW_MINUTES, 15),
    rateLimitMax: int(process.env.RATE_LIMIT_MAX, 300),
    authRateLimitWindowMinutes: int(process.env.AUTH_RATE_LIMIT_WINDOW_MINUTES, 15),
    authRateLimitMax: int(process.env.AUTH_RATE_LIMIT_MAX, 40),
  };
}

module.exports = { loadEnv };
