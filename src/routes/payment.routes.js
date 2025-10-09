// routes/paymentRoute.js
import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import paypal from "@paypal/checkout-server-sdk";
import client from "../config/paypal.js";
import { SubscriptionPlan } from "../model/entity/index.js";
import { notFound } from "../middleware/errorHandler.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { success } from "../model/dto/response.js";

const router = express.Router();

const PAYPAL_SUCCESS_URL = process.env.PAYPAL_SUCCESS_URL;
const PAYPAL_CANCEL_URL = process.env.PAYPAL_CANCEL_URL;

router.post(
  "/paypal/create-order",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Payment']
    const { planId } = req.body;
    const userId = req.user.sub;
    const plan = await SubscriptionPlan.findByPk(planId);
    if (!plan) {
      notFound("Subscription plan not found");
    }
    const price = plan.price.toFixed(2);

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: `${planId}|${userId}`,
          amount: {
            currency_code: "USD",
            value: price,
          },
        },
      ],
      application_context: {
        return_url: PAYPAL_SUCCESS_URL,
        cancel_url: PAYPAL_CANCEL_URL,
      },
    });

    const order = await client().execute(request);
    const approveUrl = order.result.links.find((l) => l.rel === "approve").href;

    success(res, approveUrl);
  })
);

export default router;
