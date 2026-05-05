const morgan = require('morgan');

function httpLogger(env) {
  if (env.nodeEnv === 'test') {
    return (req, res, next) => next();
  }
  const format =
    env.nodeEnv === 'production'
      ? ':remote-addr :method :url :status :res[content-length] - :response-time ms :req[x-request-id]'
      : 'dev';
  return morgan(format);
}

module.exports = { httpLogger };
