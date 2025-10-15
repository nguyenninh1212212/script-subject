// routes/paymentRoute.js
import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import { success } from "../model/dto/response.js";
import paymentService from "../service/paymentService.js";
import geoip from "geoip-lite";

const router = express.Router();

// router.post(
//   "/paypal/create-order",
//   authenticateToken(true),
//   asyncHandler(async (req, res) => {
//     // #swagger.tags = ['Payment']
//     const { planId } = req.body;
//     const userId = req.user.sub;
//     const ip = req.ip;
//     const geo = geoip.lookup(ip);
//     const approveUrl = await paymentService.createOrderPaypal(
//       {
//         planId,
//         userId,
//       },
//       geo
//     );

//     success(res, approveUrl);
//   })
// );

router.get(
  "/",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Payment']
    const userId = req.user.sub;
    const subs = await paymentService.getPaymentHistory({ userId });
    success(res, subs);
  })
);

export default router;
