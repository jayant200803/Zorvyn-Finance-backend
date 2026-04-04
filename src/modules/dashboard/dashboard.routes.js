const { Router } = require("express");
const controller = require("./dashboard.controller");
const { authenticate, requirePermission } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { dashboardRangeSchema, monthlyTrendsSchema } = require("../../validators/schemas");

const router = Router();

// All dashboard routes require authentication
router.use(authenticate);

// ── Basic — viewer and above ──────────────────────────────────────────────
router.get(
  "/summary",
  requirePermission("DASHBOARD_BASIC"),
  validate(dashboardRangeSchema, "query"),
  controller.getSummary
);

router.get(
  "/recent",
  requirePermission("DASHBOARD_BASIC"),
  controller.getRecentActivity
);

// ── Analytics — analyst and above ─────────────────────────────────────────
router.get(
  "/by-category",
  requirePermission("DASHBOARD_ANALYTICS"),
  validate(dashboardRangeSchema, "query"),
  controller.getByCategory
);

router.get(
  "/trends/monthly",
  requirePermission("DASHBOARD_ANALYTICS"),
  validate(monthlyTrendsSchema, "query"),
  controller.getMonthlyTrends
);

router.get(
  "/trends/weekly",
  requirePermission("DASHBOARD_ANALYTICS"),
  controller.getWeeklyTrends
);

router.get(
  "/top-categories",
  requirePermission("DASHBOARD_ANALYTICS"),
  controller.getTopCategories
);

module.exports = router;
