const { createHttpError } = require('../errors/httpError');

const SOURCES = new Set(['body', 'query', 'params']);

function validate(schema, source = 'body') {
  if (!SOURCES.has(source)) {
    throw new Error(`validate: noto‘g‘ri source "${source}"`);
  }
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(
        createHttpError(400, 'Validatsiya xatosi', {
          code: 'VALIDATION_ERROR',
          details: result.error.flatten(),
        }),
      );
    }
    req.validated = req.validated || {};
    req.validated[source] = result.data;
    return next();
  };
}

module.exports = { validate };
