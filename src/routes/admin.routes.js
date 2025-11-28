import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import adsService from "../service/adsService.js";
import { success } from "../model/dto/response.js";
import userService from "../service/userService.js";
import artistService from "../service/artistService.js";
import songService from "../service/songService.js";
import paymentService from "../service/paymentService.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken(true),
  authenticateToken("admin"),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['admin']

    const data = {
      totalUsers: await userService.totalUser(),
      totalArtist: await artistService.totalArtist(),
      totalSongs: await songService.totalSongs(),
      monthRevenue: await paymentService.totalPayment(),
      grownUser: await userService.userGrowth(),
    };

    success(res, data);
  })
);

export default router;
