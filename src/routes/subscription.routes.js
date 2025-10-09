import express from "express";
import subscriptionService from "../service/subscriptionService.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { message, success } from "../model/dto/response.js";

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Subscription']
    const subs = await subscriptionService.getSubscriptions();
    success(res, subs);
  })
);

router.post(
  "/subcribe",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Subscription']
    const { planId } = req.body;
    const userId = req.user.sub;
    await subscriptionService.createSubscription({
      userId,
      planId,
    });
    message(res, "Subscription created successfully", 201);
  })
);

export default router;
