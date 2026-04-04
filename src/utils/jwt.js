const jwt = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/env");
const { ApiError } = require("./ApiError");

/**
 * Signs a JWT payload.
 * @param {Object} payload - Data to encode (e.g. { id, role })
 * @returns {string} Signed JWT token
 */
const signToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

/**
 * Verifies and decodes a JWT token.
 * Throws ApiError.unauthorized on failure.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw ApiError.unauthorized("Token has expired. Please log in again.");
    }
    throw ApiError.unauthorized("Invalid token.");
  }
};

/**
 * Extracts Bearer token from Authorization header.
 * @param {string} authHeader
 * @returns {string|null}
 */
const extractBearerToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.split(" ")[1];
};

module.exports = { signToken, verifyToken, extractBearerToken };
