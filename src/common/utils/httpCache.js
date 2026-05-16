/**
 * Klinika detali uchun zaif ETag — `updatedAt` o'zgarganda yangilanadi.
 * @param {string} id
 * @param {string} updatedAtIso
 */
function buildClinicWeakEtag(id, updatedAtIso) {
  return `W/"clinic:${id}:${updatedAtIso}"`;
}

/**
 * @param {string | undefined} ifNoneMatch `If-None-Match` header
 * @param {string} etag
 */
function ifNoneMatchEquals(ifNoneMatch, etag) {
  if (!ifNoneMatch || !etag) return false;
  const candidates = ifNoneMatch
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return candidates.includes(etag);
}

module.exports = { buildClinicWeakEtag, ifNoneMatchEquals };
