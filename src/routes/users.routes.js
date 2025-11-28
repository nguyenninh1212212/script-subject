import express from "express";

import userService from "../service/userService.js"; // ✅ import service
import asyncHandler from "../middleware/asyncHandler.js";
import { success, message } from "../model/dto/response.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import passport from "passport";

const router = express.Router();

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['User']
    const { username, password } = req.body;
    const ress = await userService.login({ username, password });
    res.cookie("refreshToken", ress.refreshToken, {
      httpOnly: true,
      secure: process.env.IS_DEV == "N",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const { artistId, name, subscription, token, email, avatar } = ress;
    success(res, {
      user: { artistId, name, subscription, token, email, avatar },
    });
  })
);

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['User']

    const { username, password, name, email } = req.body;
    await userService.register({ username, password, name, email });
    message(res, "Register success", 201);
  })
);
router.put(
  "/change-password",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['User']
    const { name } = req.body;
    const userId = req.user.sub;
    await userService.changeName({ name, userId });
    message(res, "success", 205);
  })
);
router.get(
  "/refresh",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['User']
    const refreshToken = req.cookies.refreshToken;
    const newToken = await userService.refreshAccessToken({ refreshToken });
    success(res, { user: newToken });
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
  "/add-wallet",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['User']
    const { walletAddress } = req.body;
    const userId = req.user.sub;
    await userService.addWalletAddress({ walletAddress, userId });
    message(res, "Logged out successfully");
  })
);

router.post(
  "/google",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['User']
    const { credential } = req.body;
    const ress = await userService.googleLogin({ credential });
    res.cookie("refreshToken", ress.refreshToken, {
      httpOnly: true,
      secure: process.env.IS_DEV === "N",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    const { artistId, name, subscription, token, email, avatar } = ress;
    success(res, {
      user: { artistId, name, subscription, token, email, avatar },
    });
  })
);
router.get(
  "/google/unlink",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['User']
    const { refreshToken } = req.cookies.refreshToken;
    await userService.unLinkGoogle({ refreshToken });
    message(res, "Success", 200);
  })
);

export default router;
