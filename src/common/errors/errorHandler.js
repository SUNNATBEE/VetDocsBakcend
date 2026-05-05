const STATUS_TO_CODE = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE_ENTITY',
  429: 'RATE_LIMIT',
};

function mapKnownError(err) {
  // express.json buzilgan JSON
  if (err && err.type === 'entity.parse.failed') {
    return { status: 400, code: 'INVALID_JSON', message: 'JSON tanasi noto‘g‘ri' };
  }
  if (err && err.type === 'entity.too.large') {
    return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'So‘rov tanasi juda katta' };
  }
  // Prisma — yagonalik buzilishi
  if (err && err.code === 'P2002') {
    return { status: 409, code: 'CONFLICT', message: 'Bunday yozuv allaqachon mavjud' };
  }
  // Prisma — yozuv topilmadi
  if (err && err.code === 'P2025') {
    return { status: 404, code: 'NOT_FOUND', message: 'Yozuv topilmadi' };
  }
  return null;
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const mapped = mapKnownError(err) || {};
  const status = err.status || err.statusCode || mapped.status || 500;
  const code = err.code || mapped.code || STATUS_TO_CODE[status] || 'INTERNAL_ERROR';
  const message = err.expose || err.status ? err.message : err.message || mapped.message || 'Server xatosi';
  const details = err.details;

  if (process.env.NODE_ENV !== 'production' && status >= 500 && err.stack) {
    // eslint-disable-next-line no-console
    console.error(`[${req.requestId || '-'}]`, err.stack);
  }

  const body = {
    success: false,
    error: {
      code,
      message: status >= 500 && process.env.NODE_ENV === 'production'
        ? 'Server xatosi'
        : message,
      ...(details ? { details } : {}),
    },
    meta: { requestId: req.requestId || null },
  };

  if (process.env.NODE_ENV !== 'production' && status >= 500 && err.stack) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
}

module.exports = { errorHandler };
