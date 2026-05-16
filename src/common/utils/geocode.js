const { createHttpError } = require('../errors/httpError');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

function emptyToUndefined(v) {
  if (v === '' || v === undefined || v === null) return undefined;
  return v;
}

/**
 * Matn manzilni koordinataga aylantiradi (OpenStreetMap Nominatim).
 * Ishonchli ishlashi uchun GEOCODE_USER_AGENT da real aloqa (email yoki URL) ko'rsating.
 * @param {string} address
 * @param {object} env
 * @param {{ requestId?: string }} [ctx]
 */
async function geocodeAddress(address, env, ctx = {}) {
  const ua =
    env.geocodeUserAgent ||
    'VetClinicBackend/1.0 (set GEOCODE_USER_AGENT in .env per Nominatim policy)';

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);

  const outboundHeaders = {
    Accept: 'application/json',
    'User-Agent': ua,
  };
  if (ctx.requestId && typeof ctx.requestId === 'string' && ctx.requestId.length <= 128) {
    outboundHeaders['X-Request-Id'] = ctx.requestId;
  }

  let res;
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: outboundHeaders,
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw createHttpError(504, 'Geokodlash vaqti tugadi', { code: 'GEOCODING_TIMEOUT' });
    }
    throw createHttpError(502, 'Geokodlash xizmatiga ulanib bo‘lmadi', {
      code: 'GEOCODING_NETWORK_ERROR',
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw createHttpError(502, 'Geokodlash xizmati javob bermadi', {
      code: 'GEOCODING_UPSTREAM_ERROR',
    });
  }

  const json = await res.json();
  if (!Array.isArray(json) || json.length === 0) {
    throw createHttpError(404, 'Manzil bo‘yicha nuqta topilmadi', { code: 'ADDRESS_NOT_FOUND' });
  }

  const row = json[0];
  const lat = Number.parseFloat(row.lat);
  const lng = Number.parseFloat(row.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw createHttpError(502, 'Geokodlash javobi noto‘g‘ri', { code: 'GEOCODING_PARSE_ERROR' });
  }

  return { lat, lng };
}

module.exports = { geocodeAddress, emptyToUndefined };
