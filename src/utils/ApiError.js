/**
 * Typed API error — carries an HTTP status code alongside the message.
 * Thrown anywhere in the application and caught by the global error handler.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message, details = null) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }

  static notFound(resource = "Resource") {
    return new ApiError(404, `${resource} not found`);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }

  static internal(message = "Internal server error") {
    return new ApiError(500, message);
  }
}

/**
 * Wraps async route handlers — eliminates try/catch boilerplate.
 * Errors are forwarded to Express's next() and caught by errorHandler.
 */
const catchAsync = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ApiError, catchAsync };
