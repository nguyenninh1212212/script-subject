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
    const subs = await subscriptionService.getSubscriptions({
      userId: req.user.sub,
    });
    success(res, subs);
  })
);

router.post(
  "/subscribe/:id",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Subscription']
    const { id } = req.params;
    const { type } = req.query;
    const userId = req.user.sub;
    const ip = req.ip;
    const geo = geoip.lookup(ip);
    const approveUrl = await paymentService.createSubscriptionOrderPaypal(
      {
        planId: id,
        userId,
        type,
        paymentType: "subscription",
      },
      geo
    );
    success(res, approveUrl);
  })
);

router.post(
  "/renew/:subscriptionId",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Subscription']
    const { subscriptionId } = req.params;
    const userId = req.user.sub;
    const ip = req.ip;
    const geo = geoip.lookup(ip);
    const approveUrl = await paymentService.createSubscriptionOrderPaypal(
      {
        subscriptionId,
        userId,
        type: "renewSubscription",
      },
      geo
    );
    success(res, approveUrl);
  })
);

export default router;
