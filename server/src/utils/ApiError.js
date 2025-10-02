class ApiError extends Error {
  constructor(statusCode, error, message, details) {
    super(message || error || 'Error');
    this.name = 'ApiError';
    this.statusCode = Number(statusCode) || 500;
    this.error = error || 'internal_server_error';
    this.message = message || 'An unexpected error occurred';
    this.details = details;
    this.isOperational = true;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

module.exports = ApiError;


