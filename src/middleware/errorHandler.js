const { NODE_ENV } = require("../config/env");
const { ApiError } = require("../utils/ApiError");

/**
 * Central error handler.
 * Normalizes all error types into a consistent JSON response.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Already a typed ApiError
  if (err instanceof ApiError) {
    const body = {
      success: false,
      error: err.message,
    };
    if (err.details) body.details = err.details;
    return res.status(err.statusCode).json(body);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      success: false,
      error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
    });
  }

  // Mongoose cast error (invalid ObjectId, etc.)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      error: `Invalid value for field: ${err.path}`,
    });
  }

  // Unknown / unexpected error
  console.error("Unhandled error:", err);

  return res.status(500).json({
    success: false,
    error: "Something went wrong. Please try again.",
    // Only expose stack trace in development
    ...(NODE_ENV === "development" && { stack: err.stack }),
  });
};

/**
 * 404 handler — catches any route that didn't match.
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

module.exports = { errorHandler, notFoundHandler };
