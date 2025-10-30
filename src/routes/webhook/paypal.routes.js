import express from "express"; // Phải import express
import asyncHandler from "../../middleware/asyncHandler.js"; // Phải import
import paypal from "@paypal/checkout-server-sdk"; // Phải import
import client from "../../config/payment_wallet/paypal.config.js"; // Phải import client
import { success, message } from "../../model/dto/response.js"; // Phải import
import { notFound } from "../../middleware/errorHandler.js"; // Phải import
import paymentService from "../../service/paymentService.js"; // Phải import
import subscriptionService from "../../service/subscriptionService.js"; // Phải import

// --- BẮT ĐẦU CODE CỦA BẠN ---
const router = express.Router();

// Lấy URL frontend từ file .env
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

router.get(
  "/success",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Payment']
    const { token } = req.query;

    try {
      const request = new paypal.orders.OrdersCaptureRequest(token);
      request.requestBody({});

      const capture = await client().execute(request);
      const result = capture.result.purchase_units[0].payments.captures[0];

      if (result.status === "COMPLETED") {
        const { reference_id } = capture.result.purchase_units[0];
        // type ở đây là "USER" hoặc "ARTIST"
        const [planId, userId, type] = reference_id.split("|");

        if (!userId || !planId) {
          // Phải redirect khi lỗi, không dùng notFound()
          return res.redirect(
            `${FRONTEND_URL}/payment-failed?reason=invalid_order`
          );
        }

        // SỬA LỖI 1 (ENUM):
        // Chúng ta "dịch" 'type' ("USER") thành một 'paymentType' hợp lệ
        // mà model 'Payment' cho phép.
        //
        // TÔI GIẢ ĐỊNH NÓ LÀ "SUBSCRIPTION".
        // BẠN CÓ THỂ THAY ĐỔI GIÁ TRỊ NÀY NẾU ENUM CỦA BẠN LÀ KHÁC.
        let paymentTypeForPaymentModel;
        if (type === "USER" || type === "ARTIST") {
          paymentTypeForPaymentModel = "SUBSCRIPTION"; // <-- GIẢ ĐỊNH
        } else {
          // Nếu 'type' là một giá trị khác, ta dùng chính nó
          paymentTypeForPaymentModel = type;
        }

        await paymentService.createPayment({
          userId: userId,
          amount: result.amount.value,
          method: "paypal",
          status: "success",
          paymentType: paymentTypeForPaymentModel, // <-- Đã sửa
          transactionId: result.id,
          currencyCode: "USD",
          desciption: "Payment for " + type, // Giữ "USER" trong mô tả là OK
          orderId: token,
        });

        await subscriptionService.createSubscription({
          userId,
          planId,
        });

        return res.redirect(`${FRONTEND_URL}/payment-success?token=${token}`);
      }

      // Nếu status KHÔNG PHẢI "COMPLETED"
      return res.redirect(
        `${FRONTEND_URL}/payment-failed?reason=payment_not_completed`
      );
    } catch (error) {
      // Bắt mọi lỗi khác (ví dụ: API PayPal lỗi, CSDL lỗi)
      console.error("PayPal Success Callback Error:", error);
      return res.redirect(`${FRONTEND_URL}/payment-failed?reason=server_error`);
    }
  })
);

export default router;
