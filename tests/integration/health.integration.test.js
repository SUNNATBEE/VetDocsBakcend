const request = require('supertest');
const { createApp } = require('../../src/app');

function buildTestEnv() {
  return {
    nodeEnv: 'test',
    isProduction: false,
    port: 4001,
    databaseUrl: 'postgresql://test:test@localhost:5432/test',
    jwtAccessSecret: 'test-secret-key-with-at-least-32-characters',
    accessTokenExpiresMinutes: 15,
    refreshTokenExpiresDays: 14,
    corsOrigin: true,
    apiPrefix: '/api/v1',
    apiPublicUrl: 'http://localhost:4001',
    enableSwagger: false,
    swaggerUsername: '',
    swaggerPassword: '',
    trustProxy: false,
    rateLimitWindowMinutes: 15,
    rateLimitMax: 300,
    authRateLimitWindowMinutes: 15,
    authRateLimitMax: 40,
    geocodeUserAgent: 'VetClinicBackendTest/1.0',
    geocodeRateLimitWindowMinutes: 15,
    geocodeRateLimitMax: 500,
    readinessCheckDb: false,
  };
}

describe('Health endpoints', () => {
  const { app } = createApp(buildTestEnv());

  it('GET /api/v1/health returns success envelope', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('GET /api/v1/health/ready returns ready status', async () => {
    const res = await request(app).get('/api/v1/health/ready');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ready');
    expect(res.body.data.database).toBe('skipped');
  });
});
