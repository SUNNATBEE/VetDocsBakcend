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

describe('GET /api/v1/clinics/nearby validation', () => {
  const { app } = createApp(buildTestEnv());

  it('rejects empty query', async () => {
    const res = await request(app).get('/api/v1/clinics/nearby');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects lat without lng', async () => {
    const res = await request(app).get('/api/v1/clinics/nearby?lat=41.31');
    expect(res.status).toBe(400);
  });

  it('rejects mixing address with lat', async () => {
    const res = await request(app).get('/api/v1/clinics/nearby?address=Toshkent&lat=41.31&lng=69.25');
    expect(res.status).toBe(400);
  });

  it('rejects short address', async () => {
    const res = await request(app).get('/api/v1/clinics/nearby?address=ab');
    expect(res.status).toBe(400);
  });
});
