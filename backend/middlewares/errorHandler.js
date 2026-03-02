// global error handler
module.exports = function errorHandler(err, req, res, next) {
  console.error(err.stack || err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
};
