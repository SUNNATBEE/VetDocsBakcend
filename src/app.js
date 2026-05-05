const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const { loadEnv } = require('./config/env');
const { setupSwagger } = require('./config/swagger');
const { errorHandler } = require('./common/errors/errorHandler');
const { requestIdMiddleware } = require('./common/middleware/requestId');
const { httpLogger } = require('./common/middleware/httpLogger');
const { globalLimiter } = require('./common/middleware/rateLimiter');
const { notFoundHandler } = require('./common/middleware/notFound');
const { createV1Router } = require('./routes/v1.router');

function createApp(envOverride) {
  const env = envOverride || loadEnv();
  const app = express();

  app.disable('x-powered-by');
  if (env.trustProxy) app.set('trust proxy', 1);
  app.locals.env = env;

  app.use(requestIdMiddleware);
  app.use(httpLogger(env));

  const corsOptions =
    env.corsOrigin === true
      ? { origin: true, credentials: true }
      : { origin: env.corsOrigin, credentials: true };
  app.use(cors(corsOptions));

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      // Admin UI inline script ishlashi uchun CSP'ni o‘chiramiz (alohida sahifa)
      contentSecurityPolicy: false,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));

  // Admin web UI (statik) — /admin
  const adminUiDir = path.join(__dirname, '../public/admin');
  app.use('/admin', express.static(adminUiDir, { extensions: ['html'] }));

  app.use((req, _res, next) => {
    req.env = env;
    next();
  });

  app.use(globalLimiter(env));

  setupSwagger(app, env);

  app.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        name: 'Vet Clinic API',
        version: '1',
        api: `${env.apiPublicUrl}${env.apiPrefix}`,
        docs: env.enableSwagger ? `${env.apiPublicUrl}/docs` : null,
      },
    });
  });

  app.use(env.apiPrefix, createV1Router(env));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, env };
}

module.exports = { createApp };
