const usersService = require("./users.service");
const { catchAsync } = require("../../utils/ApiError");
const { sendSuccess, sendCreated, sendPaginated } = require("../../utils/response");

const listUsers = catchAsync(async (req, res) => {
  const { page, limit, role, status, search } = req.query;
  const { data, total } = await usersService.listUsers({ page, limit, role, status, search });
  sendPaginated(res, { data, total, page, limit, message: "Users retrieved" });
});

const getUser = catchAsync(async (req, res) => {
  const user = await usersService.getUserById(req.params.id);
  sendSuccess(res, { data: user, message: "User retrieved" });
});

const createUser = catchAsync(async (req, res) => {
  const user = await usersService.createUser(req.body);
  sendCreated(res, { data: user, message: "User created successfully" });
});

const updateUser = catchAsync(async (req, res) => {
  const user = await usersService.updateUser(req.params.id, req.body, req.user._id);
  sendSuccess(res, { data: user, message: "User updated successfully" });
});

const deactivateUser = catchAsync(async (req, res) => {
  const result = await usersService.deactivateUser(req.params.id, req.user._id);
  sendSuccess(res, { data: result, message: "User deactivated successfully" });
});

module.exports = { listUsers, getUser, createUser, updateUser, deactivateUser };
