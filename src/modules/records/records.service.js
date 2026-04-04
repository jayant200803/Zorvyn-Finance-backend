const FinancialRecord = require("../../models/FinancialRecord");
const { ApiError } = require("../../utils/ApiError");

const SORT_MAP = {
  date_asc:    { date: 1 },
  date_desc:   { date: -1 },
  amount_asc:  { amount: 1 },
  amount_desc: { amount: -1 },
};

/**
 * Returns paginated, filtered financial records.
 */
const listRecords = async ({ page, limit, type, category, date_from, date_to, sort }) => {
  const filter = {};

  if (type)     filter.type = type;
  if (category) filter.category = { $regex: category, $options: "i" };
  if (date_from || date_to) {
    filter.date = {};
    if (date_from) filter.date.$gte = new Date(date_from);
    if (date_to)   filter.date.$lte = new Date(date_to + "T23:59:59.999Z");
  }

  const skip      = (page - 1) * limit;
  const sortQuery = SORT_MAP[sort] || SORT_MAP.date_desc;

  const [data, total] = await Promise.all([
    FinancialRecord.find(filter)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .populate("createdBy", "name email")
      .lean(),
    FinancialRecord.countDocuments(filter),
  ]);

  return { data, total };
};

/**
 * Returns a single record by ID.
 */
const getRecordById = async (id) => {
  const record = await FinancialRecord.findById(id)
    .populate("createdBy", "name email")
    .lean();

  if (!record) throw ApiError.notFound("Record");
  return record;
};

/**
 * Creates a new financial record.
 */
const createRecord = async (payload, userId) => {
  const record = await FinancialRecord.create({
    ...payload,
    date: new Date(payload.date),
    createdBy: userId,
  });

  return record.populate("createdBy", "name email");
};

/**
 * Updates an existing record.
 */
const updateRecord = async (id, payload) => {
  if (payload.date) payload.date = new Date(payload.date);

  const record = await FinancialRecord.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true }
  ).populate("createdBy", "name email");

  if (!record) throw ApiError.notFound("Record");
  return record;
};

/**
 * Soft-deletes a record using the model's instance method.
 */
const deleteRecord = async (id) => {
  const record = await FinancialRecord.findById(id);
  if (!record) throw ApiError.notFound("Record");
  await record.softDelete();
  return { id: record._id };
};

module.exports = { listRecords, getRecordById, createRecord, updateRecord, deleteRecord };
