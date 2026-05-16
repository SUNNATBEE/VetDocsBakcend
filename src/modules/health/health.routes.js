const express = require('express');
const path = require('path');
const { prisma } = require('../../infrastructure/database/prisma.client');
const { getMetrics, register } = require('../../common/observability/metrics');

function readPackageVersion() {
  try {
    // eslint-disable-next-line global-require
    const pkg = require(path.join(__dirname, '../../../package.json'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function createHealthRouter(env) {
  const router = express.Router();
  const version = readPackageVersion();
  const startedAt = new Date();

  router.get('/', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'vet-clinic-api',
        version,
        startedAt: startedAt.toISOString(),
        uptimeSec: Math.round(process.uptime()),
        docs: env.enableSwagger ? `${env.apiPublicUrl}/docs` : null,
      },
    });
  });

  router.get('/ready', async (req, res) => {
    if (!env.readinessCheckDb) {
      return res.json({
        success: true,
        data: {
          status: 'ready',
          database: 'skipped',
          timestamp: new Date().toISOString(),
        },
      });
    }
    try {
      await prisma.$queryRaw`SELECT 1`;
      return res.json({
        success: true,
        data: {
          status: 'ready',
          database: 'connected',
          timestamp: new Date().toISOString(),
        },
      });
    } catch {
      return res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Postgres ulanishi tekshirilmadi',
        },
        meta: { requestId: req.requestId || null },
      });
    }
  });

  router.get('/db', async (_req, res, next) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({
        success: true,
        data: {
          status: 'ok',
          database: 'connected',
        },
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/metrics', async (_req, res, next) => {
    try {
      const metrics = await getMetrics();
      res.set('Content-Type', register.contentType);
      res.status(200).send(metrics);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = { createHealthRouter };
