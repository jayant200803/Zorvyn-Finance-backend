const User = require("../../models/User");
const { signToken } = require("../../utils/jwt");
const { ApiError } = require("../../utils/ApiError");

/**
 * Authenticates a user by email and password.
 * Returns a signed JWT and public user data on success.
 */
const login = async ({ email, password }) => {
  const user = await User.findByEmailWithPassword(email);

  if (!user || !(await user.comparePassword(password))) {
    // Intentionally vague to prevent email enumeration
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (user.status === "inactive") {
    throw ApiError.forbidden("Your account has been deactivated. Contact an administrator.");
  }

  // Update last login timestamp
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken({ id: user._id, role: user.role });

  return { token, user: user.toPublicJSON() };
};

module.exports = { login };
