const express = require('express');
const path = require('path');

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

  return router;
}

module.exports = { createHealthRouter };
