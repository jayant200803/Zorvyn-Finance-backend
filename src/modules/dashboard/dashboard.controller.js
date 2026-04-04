const dashboardService = require("./dashboard.service");
const { catchAsync } = require("../../utils/ApiError");
const { sendSuccess } = require("../../utils/response");
const { z } = require("zod");
const { validate } = require("../../middleware/validate");

const getSummary = catchAsync(async (req, res) => {
  const data = await dashboardService.getSummary(req.query);
  sendSuccess(res, { data, message: "Summary retrieved" });
});

const getByCategory = catchAsync(async (req, res) => {
  const data = await dashboardService.getByCategory(req.query);
  sendSuccess(res, { data, message: "Category breakdown retrieved" });
});

const getMonthlyTrends = catchAsync(async (req, res) => {
  const data = await dashboardService.getMonthlyTrends(req.query);
  sendSuccess(res, { data, message: "Monthly trends retrieved" });
});

const getWeeklyTrends = catchAsync(async (req, res) => {
  const { weeks } = req.query;
  const data = await dashboardService.getWeeklyTrends({ weeks: weeks ? parseInt(weeks) : 12 });
  sendSuccess(res, { data, message: "Weekly trends retrieved" });
});

const getRecentActivity = catchAsync(async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  const data = await dashboardService.getRecentActivity({ limit });
  sendSuccess(res, { data, message: "Recent activity retrieved" });
});

const getTopCategories = catchAsync(async (req, res) => {
  const { type = "expense", limit = 5 } = req.query;
  const data = await dashboardService.getTopCategories({ type, limit: parseInt(limit) });
  sendSuccess(res, { data, message: "Top categories retrieved" });
});

module.exports = {
  getSummary,
  getByCategory,
  getMonthlyTrends,
  getWeeklyTrends,
  getRecentActivity,
  getTopCategories,
};
