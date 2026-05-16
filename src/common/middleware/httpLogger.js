function pathnameOnly(originalUrl) {
  if (!originalUrl || typeof originalUrl !== 'string') return '';
  const q = originalUrl.indexOf('?');
  return q === -1 ? originalUrl : originalUrl.slice(0, q);
}

function httpLogger(env) {
  if (env.nodeEnv === 'test') {
    return (req, res, next) => next();
  }
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const latencyMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const path = pathnameOnly(req.originalUrl);
      const adminMutation =
        path.startsWith(`${env.apiPrefix}/admin`) &&
        !['GET', 'HEAD', 'OPTIONS'].includes(req.method);

      const payload = {
        ts: new Date().toISOString(),
        level: res.statusCode >= 500 ? 'error' : 'info',
        message: 'http_request',
        service: 'vet-clinic-api',
        requestId: req.requestId,
        userId: req.user?.id || null,
        method: req.method,
        path,
        route: req.originalUrl,
        status: res.statusCode,
        latencyMs: Number(latencyMs.toFixed(2)),
        ip: req.ip,
        userAgent: req.get('user-agent') || null,
        ...(adminMutation ? { audit: { kind: 'admin_mutation', path } } : {}),
      };
      const line = JSON.stringify(payload);
      // eslint-disable-next-line no-console
      if (res.statusCode >= 500) console.error(line);
      // eslint-disable-next-line no-console
      else console.log(line);
    });

    next();
  };
}

module.exports = { httpLogger };
