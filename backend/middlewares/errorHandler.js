const { normalizeDatabaseError } = require('../config/database');

// global error handler
module.exports = function errorHandler(err, req, res, next) {
  const normalizedError = normalizeDatabaseError(err);
  const status = normalizedError.status || 500;

  console.error(normalizedError.stack || normalizedError);

  res.status(status).json({
    message: normalizedError.message || 'Internal Server Error',
    code: normalizedError.code || 'INTERNAL_SERVER_ERROR',
  });
};
