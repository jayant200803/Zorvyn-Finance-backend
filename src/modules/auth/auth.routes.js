const { Router } = require("express");
const authService = require("./auth.service");
const { catchAsync } = require("../../utils/ApiError");
const { authenticate } = require("../../middleware/auth");
const { validate } = require("../../middleware/validate");
const { loginSchema } = require("../../validators/schemas");
const { sendSuccess } = require("../../utils/response");

const router = Router();

router.post(
  "/login",
  validate(loginSchema),
  catchAsync(async (req, res) => {
    const result = await authService.login(req.body);
    sendSuccess(res, { data: result, message: "Login successful" });
  })
);

router.get(
  "/me",
  authenticate,
  catchAsync(async (req, res) => {
    sendSuccess(res, { data: req.user.toPublicJSON(), message: "Profile retrieved" });
  })
);

module.exports = router;
