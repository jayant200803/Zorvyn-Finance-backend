const User = require("../models/User");
const { verifyToken, extractBearerToken } = require("../utils/jwt");
const { ApiError, catchAsync } = require("../utils/ApiError");
const { ROLE_HIERARCHY, hasPermission } = require("../config/roles");

/**
 * Verifies JWT and attaches the full user document to req.user.
 * Checks that the user is still active in the DB.
 */
const authenticate = catchAsync(async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) throw ApiError.unauthorized("No token provided. Please log in.");

  const decoded = verifyToken(token);

  const user = await User.findById(decoded.id).select("-password");
  if (!user) throw ApiError.unauthorized("User no longer exists.");
  if (user.status === "inactive") throw ApiError.forbidden("Your account has been deactivated.");

  req.user = user;
  next();
});

/**
 * Role guard using numeric hierarchy.
 * requireMinRole('analyst') allows analyst AND admin.
 *
 * Usage: router.get('/analytics', authenticate, requireMinRole('analyst'), handler)
 */
const requireMinRole = (minRole) => (req, res, next) => {
  const userLevel = ROLE_HIERARCHY[req.user?.role] ?? 0;
  const minLevel  = ROLE_HIERARCHY[minRole] ?? 0;

  if (userLevel < minLevel) {
    return next(ApiError.forbidden(`Requires at least '${minRole}' role.`));
  }
  next();
};

/**
 * Permission guard using the explicit permission matrix in config/roles.js.
 * Preferred for business-logic gates — makes intent clearer than hierarchy.
 *
 * Usage: router.post('/records', authenticate, requirePermission('RECORDS_WRITE'), handler)
 */
const requirePermission = (permission) => (req, res, next) => {
  if (!hasPermission(req.user?.role, permission)) {
    return next(ApiError.forbidden(`Missing permission: ${permission}`));
  }
  next();
};

/**
 * Shorthand: only exact role(s) allowed.
 * Usage: requireRole('admin') or requireRole('admin', 'analyst')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return next(ApiError.forbidden(`Requires one of: [${roles.join(", ")}]`));
  }
  next();
};

module.exports = { authenticate, requireMinRole, requirePermission, requireRole };
