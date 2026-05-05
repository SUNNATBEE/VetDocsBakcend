const { createHttpError } = require('../errors/httpError');

function notFoundHandler(req, res, next) {
  next(createHttpError(404, 'Marshrut topilmadi', { code: 'NOT_FOUND' }));
}

module.exports = { notFoundHandler };
