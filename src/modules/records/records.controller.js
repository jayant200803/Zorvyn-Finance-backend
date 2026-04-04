const recordsService = require("./records.service");
const { catchAsync } = require("../../utils/ApiError");
const { sendSuccess, sendCreated, sendPaginated } = require("../../utils/response");

const listRecords = catchAsync(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const { data, total } = await recordsService.listRecords({ page, limit, ...filters });
  sendPaginated(res, { data, total, page, limit, message: "Records retrieved" });
});

const getRecord = catchAsync(async (req, res) => {
  const record = await recordsService.getRecordById(req.params.id);
  sendSuccess(res, { data: record, message: "Record retrieved" });
});

const createRecord = catchAsync(async (req, res) => {
  const record = await recordsService.createRecord(req.body, req.user._id);
  sendCreated(res, { data: record, message: "Record created successfully" });
});

const updateRecord = catchAsync(async (req, res) => {
  const record = await recordsService.updateRecord(req.params.id, req.body);
  sendSuccess(res, { data: record, message: "Record updated successfully" });
});

const deleteRecord = catchAsync(async (req, res) => {
  const result = await recordsService.deleteRecord(req.params.id);
  sendSuccess(res, { data: result, message: "Record deleted successfully" });
});

module.exports = { listRecords, getRecord, createRecord, updateRecord, deleteRecord };
