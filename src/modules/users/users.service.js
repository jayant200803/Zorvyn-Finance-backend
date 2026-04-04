const User = require("../../models/User");
const { ApiError } = require("../../utils/ApiError");

/**
 * Returns a paginated, filterable list of users.
 */
const listUsers = async ({ page, limit, role, status, search }) => {
  const filter = {};

  if (role)   filter.role   = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip  = (page - 1) * limit;
  const [data, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return { data, total };
};

/**
 * Returns a single user by ID.
 */
const getUserById = async (id) => {
  const user = await User.findById(id).lean();
  if (!user) throw ApiError.notFound("User");
  return user;
};

/**
 * Creates a new user.
 * Guards against duplicate emails at the service layer (Mongo also enforces this).
 */
const createUser = async (payload) => {
  const existing = await User.findOne({ email: payload.email });
  if (existing) throw ApiError.conflict("A user with this email already exists");

  const user = await User.create(payload);
  return user.toPublicJSON();
};

/**
 * Updates allowed fields on a user.
 * Prevents an admin from deactivating their own account.
 */
const updateUser = async (id, payload, requesterId) => {
  if (id === requesterId.toString() && payload.status === "inactive") {
    throw ApiError.badRequest("You cannot deactivate your own account");
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true }
  );

  if (!user) throw ApiError.notFound("User");
  return user.toPublicJSON();
};

/**
 * Soft-deactivates a user by setting status to inactive.
 * Prevents self-deletion.
 */
const deactivateUser = async (id, requesterId) => {
  if (id === requesterId.toString()) {
    throw ApiError.badRequest("You cannot deactivate your own account");
  }

  const user = await User.findByIdAndUpdate(
    id,
    { $set: { status: "inactive" } },
    { new: true }
  );

  if (!user) throw ApiError.notFound("User");
  return { id: user._id, status: user.status };
};

module.exports = { listUsers, getUserById, createUser, updateUser, deactivateUser };
