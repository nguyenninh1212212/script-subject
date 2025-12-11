import express from "express";

import asyncHandler from "../middleware/asyncHandler.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import adsService from "../service/adsService.js";
import { message, success } from "../model/dto/response.js";
import userService from "../service/userService.js";
import artistService from "../service/artistService.js";
import songService from "../service/songService.js";
import paymentService from "../service/paymentService.js";
import subscription from "../service/subscriptionService.js";

const router = express.Router();
router.get(
  "/",
  authenticateToken(true),
  authenticateToken("admin"),
  asyncHandler(async (req, res) => {
    const [totalUsers, totalArtist, totalSongs, monthRevenue, subscriptions] =
      await Promise.all([
        userService.totalUser(),
        artistService.totalArtist(),
        songService.totalSongs(),
        paymentService.totalPayment(),
        subscription.getTotalSubscriptionsByType(),
      ]);

    const data = {
      totalUsers,
      totalArtist,
      totalSongs,
      monthRevenue,
      subscriptions,
    };

    success(res, data);
  })
);
router.post(
  "/ban-user/:id",
  authenticateToken(true),
  authenticateToken("admin"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    console.log("🚀 ~ id:", id);
    const { isBan } = req.body;
    console.log("🚀 ~ isBan:", isBan);
    await userService.banAccount({ userId: id, isBan });
    message(res, "Success");
  })
);
router.post(
  "/ban-artist/:id",
  authenticateToken(true),
  authenticateToken("admin", "staff"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isBan } = req.body;
    await artistService.banArtist({ artistId: id, isBan });
    message(res, "Success");
  })
);
router.post(
  "/ban-song/:id",
  authenticateToken(true),
  authenticateToken("admin", "staff"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { isBan } = req.body;
    await songService.banSong({ songId: id, isBan });
    message(res, "Success");
  })
);

export default router;
