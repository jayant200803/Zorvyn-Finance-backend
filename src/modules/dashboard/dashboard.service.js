const FinancialRecord = require("../../models/FinancialRecord");

/**
 * Builds a base $match stage from optional date range filters.
 * Note: isDeleted filter is injected automatically by the model's pre-aggregate hook.
 */
const buildDateMatch = (date_from, date_to) => {
  if (!date_from && !date_to) return {};
  const dateFilter = {};
  if (date_from) dateFilter.$gte = new Date(date_from);
  if (date_to)   dateFilter.$lte = new Date(date_to + "T23:59:59.999Z");
  return { date: dateFilter };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Overall financial summary: total income, total expenses, net balance.
 * Optional date range scoping.
 */
const getSummary = async ({ date_from, date_to } = {}) => {
  const dateMatch = buildDateMatch(date_from, date_to);

  const [result] = await FinancialRecord.aggregate([
    { $match: dateMatch },
    {
      $group: {
        _id: null,
        totalIncome: {
          $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
        },
        totalExpenses: {
          $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
        },
        totalRecords: { $sum: 1 },
        avgTransactionAmount: { $avg: "$amount" },
      },
    },
    {
      $addFields: {
        netBalance: { $subtract: ["$totalIncome", "$totalExpenses"] },
      },
    },
    { $project: { _id: 0 } },
  ]);

  // Return zeroes when no data exists
  return result ?? {
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    totalRecords: 0,
    avgTransactionAmount: 0,
  };
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Income and expense totals broken down by category.
 * Returns both income and expense rows so the frontend can render a split view.
 */
const getByCategory = async ({ date_from, date_to, type } = {}) => {
  const match = buildDateMatch(date_from, date_to);
  if (type) match.type = type;

  const data = await FinancialRecord.aggregate([
    { $match: match },
    {
      $group: {
        _id:     { category: "$category", type: "$type" },
        total:   { $sum: "$amount" },
        count:   { $sum: 1 },
        average: { $avg: "$amount" },
        min:     { $min: "$amount" },
        max:     { $max: "$amount" },
      },
    },
    {
      $project: {
        _id:      0,
        category: "$_id.category",
        type:     "$_id.type",
        total:    { $round: ["$total", 2] },
        count:    1,
        average:  { $round: ["$average", 2] },
        min:      1,
        max:      1,
      },
    },
    { $sort: { total: -1 } },
  ]);

  return data;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Monthly trends: income vs expenses for each month.
 * Optional year filter.
 */
const getMonthlyTrends = async ({ year } = {}) => {
  const match = {};
  if (year) {
    match.date = {
      $gte: new Date(`${year}-01-01`),
      $lte: new Date(`${year}-12-31T23:59:59.999Z`),
    };
  }

  const data = await FinancialRecord.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year:  { $year: "$date" },
          month: { $month: "$date" },
        },
        income: {
          $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
        },
        expenses: {
          $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
        },
        transactionCount: { $sum: 1 },
      },
    },
    {
      $addFields: {
        net: { $subtract: ["$income", "$expenses"] },
        // Format as "YYYY-MM" string for easy frontend consumption
        month: {
          $dateToString: {
            format: "%Y-%m",
            date: {
              $dateFromParts: { year: "$_id.year", month: "$_id.month", day: 1 },
            },
          },
        },
      },
    },
    {
      $project: {
        _id:              0,
        month:            1,
        income:           { $round: ["$income", 2] },
        expenses:         { $round: ["$expenses", 2] },
        net:              { $round: ["$net", 2] },
        transactionCount: 1,
      },
    },
    { $sort: { month: 1 } },
  ]);

  return data;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Weekly trends for the last N weeks (default 12).
 */
const getWeeklyTrends = async ({ weeks = 12 } = {}) => {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const data = await FinancialRecord.aggregate([
    { $match: { date: { $gte: since } } },
    {
      $group: {
        _id: {
          year: { $isoWeekYear: "$date" },
          week: { $isoWeek: "$date" },
        },
        income: {
          $sum: { $cond: [{ $eq: ["$type", "income"] }, "$amount", 0] },
        },
        expenses: {
          $sum: { $cond: [{ $eq: ["$type", "expense"] }, "$amount", 0] },
        },
        transactionCount: { $sum: 1 },
      },
    },
    {
      $addFields: {
        net:  { $subtract: ["$income", "$expenses"] },
        week: {
          $concat: [
            { $toString: "$_id.year" },
            "-W",
            {
              $cond: {
                if:   { $lt: ["$_id.week", 10] },
                then: { $concat: ["0", { $toString: "$_id.week" }] },
                else: { $toString: "$_id.week" },
              },
            },
          ],
        },
      },
    },
    {
      $project: {
        _id:              0,
        week:             1,
        income:           { $round: ["$income", 2] },
        expenses:         { $round: ["$expenses", 2] },
        net:              { $round: ["$net", 2] },
        transactionCount: 1,
      },
    },
    { $sort: { week: 1 } },
  ]);

  return data;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Most recent N transactions (default 10).
 */
const getRecentActivity = async ({ limit = 10 } = {}) => {
  const data = await FinancialRecord.find()
    .sort({ date: -1, createdAt: -1 })
    .limit(limit)
    .populate("createdBy", "name email")
    .lean();

  return data;
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Top N categories by spend or income.
 */
const getTopCategories = async ({ type = "expense", limit = 5 } = {}) => {
  const data = await FinancialRecord.aggregate([
    { $match: { type } },
    {
      $group: {
        _id:   "$category",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        _id:      0,
        category: "$_id",
        total:    { $round: ["$total", 2] },
        count:    1,
      },
    },
    { $sort: { total: -1 } },
    { $limit: limit },
  ]);

  return data;
};

module.exports = {
  getSummary,
  getByCategory,
  getMonthlyTrends,
  getWeeklyTrends,
  getRecentActivity,
  getTopCategories,
};
