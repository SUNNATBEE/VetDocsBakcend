const client = require('prom-client');

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestDurationMs = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP so‘rov davomiyligi (ms)',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [25, 50, 100, 200, 400, 800, 1200, 2000, 5000],
  registers: [register],
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Jami HTTP so‘rovlar soni',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

function metricsMiddleware(req, res, next) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const route = req.route?.path || req.baseUrl || req.path || 'unknown';
    const labels = {
      method: req.method,
      route: String(route),
      status_code: String(res.statusCode),
    };

    httpRequestDurationMs.observe(labels, elapsedMs);
    httpRequestsTotal.inc(labels);
  });

  next();
}

async function getMetrics() {
  return register.metrics();
}

module.exports = {
  metricsMiddleware,
  getMetrics,
  register,
};
