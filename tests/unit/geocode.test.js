const { geocodeAddress } = require('../../src/common/utils/geocode');

describe('geocodeAddress', () => {
  const env = { geocodeUserAgent: 'VetClinicBackendTest/1.0' };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses first Nominatim hit', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '41.3', lon: '69.2', display_name: 'Test' }],
    });

    const out = await geocodeAddress('Toshkent', env);
    expect(out).toEqual({ lat: 41.3, lng: 69.2 });
    expect(global.fetch).toHaveBeenCalled();
    const [url] = global.fetch.mock.calls[0];
    expect(String(url)).toContain('nominatim.openstreetmap.org');
  });

  it('forwards X-Request-Id to upstream when provided', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '1', lon: '2' }],
    });

    await geocodeAddress('A', env, { requestId: 'req-test-uuid' });

    expect(fetchSpy).toHaveBeenCalled();
    const opts = fetchSpy.mock.calls[0][1];
    expect(opts.headers['X-Request-Id']).toBe('req-test-uuid');
  });

  it('throws ADDRESS_NOT_FOUND when empty array', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await expect(geocodeAddress('zzzznonexistent99999', env)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
