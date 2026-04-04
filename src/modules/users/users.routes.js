const { Router } = require("express");
const controller = require("./users.controller");
const { authenticate, requirePermission } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const {
  createUserSchema,
  updateUserSchema,
  listUsersSchema,
  mongoIdSchema,
} = require("../../validators/schemas");
const { z } = require("zod");

const router = Router();

// All user management routes require authentication + USERS_MANAGE permission
router.use(authenticate, requirePermission("USERS_MANAGE"));

router.get(
  "/",
  validate(listUsersSchema, "query"),
  controller.listUsers
);

router.get(
  "/:id",
  validate(z.object({ id: mongoIdSchema }), "params"),
  controller.getUser
);

router.post(
  "/",
  validate(createUserSchema),
  controller.createUser
);

router.patch(
  "/:id",
  validate(z.object({ id: mongoIdSchema }), "params"),
  validate(updateUserSchema),
  controller.updateUser
);

router.delete(
  "/:id",
  validate(z.object({ id: mongoIdSchema }), "params"),
  controller.deactivateUser
);

module.exports = router;
