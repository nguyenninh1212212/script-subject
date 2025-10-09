import express from "express";
import PlanService from "../service/planService.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { success } from "../model/dto/response.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Subscription plan']
    const subs = await PlanService.getPlans();
    success(res, subs);
  })
);

router.post(
  "/",
  authenticateToken(true),
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Subscription plan']
    const { name, price, duration, type } = req.body;
    const sub = await PlanService.createPlan({
      name,
      price,
      duration,
      type,
    });
    success(res, sub, 201);
  })
);

export default router;
