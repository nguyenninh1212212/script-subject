const express = require("express");
const router = express.Router();
const userService = require("../service/userService");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/middleware");
const asyncHandler = require("../middleware/asyncHandler");
const { success, message } = require("../model/dto/response");
// Login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const token = await userService.login({ username, password });
    success(res, token);
  })
);

// Register
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body; //
    await userService.register({ username, email, password });
    message(res, "Register success", 201);
  })
);

router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    const users = await userService.getUsers();
    success(res, users);
  })
);

module.exports = router;
