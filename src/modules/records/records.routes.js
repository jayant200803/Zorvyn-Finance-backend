const { Router } = require("express");
const controller = require("./records.controller");
const { authenticate, requirePermission } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const {
  createRecordSchema,
  updateRecordSchema,
  listRecordsSchema,
  mongoIdSchema,
} = require("../../validators/schemas");
const { z } = require("zod");

const router = Router();

const idParam = validate(z.object({ id: mongoIdSchema }), "params");

// Read — viewer and above
router.get(
  "/",
  authenticate,
  requirePermission("RECORDS_READ"),
  validate(listRecordsSchema, "query"),
  controller.listRecords
);

router.get(
  "/:id",
  authenticate,
  requirePermission("RECORDS_READ"),
  idParam,
  controller.getRecord
);

// Write — admin only
router.post(
  "/",
  authenticate,
  requirePermission("RECORDS_WRITE"),
  validate(createRecordSchema),
  controller.createRecord
);

router.patch(
  "/:id",
  authenticate,
  requirePermission("RECORDS_WRITE"),
  idParam,
  validate(updateRecordSchema),
  controller.updateRecord
);

router.delete(
  "/:id",
  authenticate,
  requirePermission("RECORDS_DELETE"),
  idParam,
  controller.deleteRecord
);

module.exports = router;
