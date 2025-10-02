const ApiError = require('../utils/ApiError');

const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, 'not_found', 'Route not found'));
};

// Centralized error handler
// If an error is not an ApiError, wrap it as one
const errorHandler = (err, req, res, next) => {
  const isApiError = err instanceof ApiError;

  const normalizedError = isApiError
    ? err
    : new ApiError(
        err.statusCode || 500,
        err.code || 'internal_server_error',
        err.message || 'Internal Server Error',
        err.details
      );

  const responseBody = {
    success: false,
    error: normalizedError.error,
    message: normalizedError.message,
  };

  if (normalizedError.details) {
    responseBody.details = normalizedError.details;
  }

  if (process.env.NODE_ENV !== 'production' && normalizedError.stack) {
    responseBody.stack = normalizedError.stack;
  }

  res.status(normalizedError.statusCode).json(responseBody);
};

module.exports = { notFoundHandler, errorHandler };


