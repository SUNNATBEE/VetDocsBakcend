/**
 * @param {number} status HTTP status
 * @param {string} message Inson o‘qiydigan xabar
 * @param {{ code?: string, details?: unknown }} [meta]
 */
function createHttpError(status, message, meta = {}) {
  const err = new Error(message);
  err.status = status;
  err.statusCode = status;
  if (meta.code) err.code = meta.code;
  if (meta.details !== undefined) err.details = meta.details;
  return err;
}

module.exports = { createHttpError };
