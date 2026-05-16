const { buildClinicWeakEtag, ifNoneMatchEquals } = require('../../src/common/utils/httpCache');

describe('httpCache', () => {
  it('buildClinicWeakEtag is stable for same inputs', () => {
    const e = buildClinicWeakEtag('c1', '2026-01-01T00:00:00.000Z');
    expect(e).toBe('W/"clinic:c1:2026-01-01T00:00:00.000Z"');
  });

  it('ifNoneMatchEquals matches exact etag', () => {
    const etag = 'W/"clinic:x:2026-01-01T00:00:00.000Z"';
    expect(ifNoneMatchEquals(etag, etag)).toBe(true);
    expect(ifNoneMatchEquals('"other"', etag)).toBe(false);
  });

  it('ifNoneMatchEquals handles comma-separated list', () => {
    const etag = 'W/"a"';
    expect(ifNoneMatchEquals('W/"x", W/"a"', etag)).toBe(true);
  });
});
