import express from "express";
import subscriptionService from "../service/subscriptionService.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { message, success } from "../model/dto/response.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import paymentService from "../service/paymentService.js";
import geoip from "geoip-lite";

const router = express.Router();

router.get(
  "/",
  authenticateToken(true),

  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Subscription']
    const subs = await subscriptionService.getSubscriptions({ userId });
    success(res, subs);
  })
);

router.post(
  "/subcribe",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Subscription']
    const { planId } = req.body;
    const userId = req.user.sub;
    const ip = req.ip;
    const geo = geoip.lookup(ip);
    const approveUrl = await paymentService.createOrderPaypal(
      {
        planId,
        userId,
      },
      geo
    );
    success(res, approveUrl);
  })
);

export default router;
