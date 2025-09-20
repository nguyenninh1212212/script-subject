import express from "express";
import userService from "../service/userService.js"; // ✅ import service
import asyncHandler from "../middleware/asyncHandler.js";
import { success, message } from "../model/dto/response.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Login
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    const token = await userService.login({ username, password }); // dùng userService
    success(res, token);
  })
);

// Register
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;
    await userService.register({ username, email, password }); // dùng userService
    message(res, "Register success", 201);
  })
);

// Get all users (admin only)
router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    const users = await userService.getUsers(); // dùng userService
    success(res, users);
  })
);

export default router;
