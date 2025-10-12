import express from "express";
import userService from "../service/userService.js"; // ✅ import service
import asyncHandler from "../middleware/asyncHandler.js";
import { success, message } from "../model/dto/response.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['User']
    const { username, password } = req.body;
    const token = await userService.login({ username, password });
    success(res, token);
  })
);

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['User']

    const { username, email, password } = req.body;
    await userService.register({ username, email, password });
    message(res, "Register success", 201);
  })
);

router.get(
  "/",
  authenticateToken(true),
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['User']
    const users = await userService.getUsers();
    success(res, users);
  })
);

router.post(
  "/change-password",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['User']

    const { username, newPassword, oldPassword } = req.body;
    await userService.changePassword(username, oldPassword, newPassword);
    message(res, "Password changed successfully");
  })
);

router.post(
  "/logout",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['User']
    await userService.logout(req.user.sub);
    message(res, "Logged out successfully");
  })
);

router.post(
  "/google",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['User']
    const { credential } = req.body;
    const result = await userService.googleLogin({ credential });
    success(res, result);
  })
);

export default router;
