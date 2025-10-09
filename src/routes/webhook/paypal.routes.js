// routes/paypal.js
import express from "express";
import paypal from "@paypal/checkout-server-sdk";
import client from "../../config/paypal.js";
import paymentService from "../../service/paymentService.js";
import { notFound } from "../../middleware/errorHandler.js";
import asyncHandler from "../../middleware/asyncHandler.js";
import { message } from "../../model/dto/response.js";

const router = express.Router();

router.get(
  "/success",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Payment']
    const { token } = req.query;
    const request = new paypal.orders.OrdersCaptureRequest(token);
    request.requestBody({});

    const capture = await client().execute(request);
    const result = capture.result.purchase_units[0].payments.captures[0];

    if (result.status === "COMPLETED") {
      const { reference_id } = capture.result.purchase_units[0];
      const [planId, userId] = reference_id.split("|");
      if (!userId || !planId) {
        notFound("Missing in the order");
      }

      await paymentService.createPayment({
        userId: userId,
        planId: planId,
        amount: result.amount.value,
        method: "paypal",
        status: "success",
        paymentType: "subscription",
        transactionId: result.id,
      });

      return message(res, "✅ Thanh toán thành công!");
    }

    return message(res, "❌ Thanh toán không thành công!");
  })
);

router.get("/cancel", (req, res) => {
  // #swagger.tags = ['Payment']
  res.send("❌ Bạn đã hủy thanh toán!");
});

export default router;
