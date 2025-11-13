import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import {
  createTicket,
  logPurchase,
  setFee,
  setWaller,
  getTickets,
} from "../service/nft/nftService.js";
import { success } from "../model/dto/response.js";
import upload from "../middleware/multer.js";
import { badRequest } from "../middleware/errorHandler.js";

const router = express.Router();

const parseCustomDateTime = (dateTimeString) => {
  if (!dateTimeString) return null;

  const parts = dateTimeString.split(" "); // Tách ngày và giờ
  const dateParts = parts[0].split("/"); // Tách DD, MM, YYYY

  if (dateParts.length !== 3) return null; // Sai định dạng ngày

  const day = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1; // Tháng trong JS bắt đầu từ 0
  const year = parseInt(dateParts[2], 10);

  let hour = 0;
  let minute = 0;

  if (parts.length > 1) {
    // Nếu có nhập giờ
    const timeParts = parts[1].split(":");
    if (timeParts.length >= 2) {
      hour = parseInt(timeParts[0], 10);
      minute = parseInt(timeParts[1], 10);
    }
  }

  // Tạo đối tượng Date (Lưu ý: dùng Date.UTC để tránh múi giờ)
  const dateObj = new Date(Date.UTC(year, month, day, hour, minute));

  // Kiểm tra xem ngày có hợp lệ không (ví dụ: 31/02/...)
  if (
    dateObj.getUTCFullYear() !== year ||
    dateObj.getUTCMonth() !== month ||
    dateObj.getUTCDate() !== day
  ) {
    return null; // Ngày không hợp lệ
  }

  return dateObj;
};

router.post(
  "/set-fee",
  authenticateToken(true),
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const { newFee } = req.body;
    const ads = await setFee(newFee);
    success(res, ads);
  })
);

router.post(
  "/set-wallet",
  authenticateToken(true),
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const { newWallet } = req.body;
    const ads = await setWaller(newWallet);
    success(res, ads);
  })
);

router.post(
  "/create-ticket",
  authenticateToken(true),
  upload.single("coverFile"),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const userId = req.user.sub;
    const coverFile = req.file;

    // --- 1. VALIDATE DỮ LIỆU ĐẦU VÀO (TRƯỚC KHI GỌI IPFS) ---

    // 1a. Validate file
    if (!coverFile) {
      return badRequest(res, "File 'coverFile' là bắt buộc.");
    }

    // 1b. Validate body
    const { title, date, location, price, maxSupply, saleDeadline } = req.body;

    if (!title || !date || !location || !price || !maxSupply || !saleDeadline) {
      return badRequest(res, "Vui lòng nhập đầy đủ các trường bắt buộc.");
    }

    // 1c. Validate và chuyển đổi Number
    const priceNum = parseFloat(price);
    const maxSupplyNum = parseInt(maxSupply, 10);

    if (isNaN(priceNum) || priceNum <= 0) {
      return badRequest(res, "Giá (price) không hợp lệ.");
    }
    if (isNaN(maxSupplyNum) || maxSupplyNum <= 0) {
      return badRequest(res, "Số lượng (maxSupply) không hợp lệ.");
    }

    let dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      dateObj = parseCustomDateTime(date);
    }

    let saleDeadlineObj = new Date(saleDeadline);
    if (isNaN(saleDeadlineObj.getTime())) {
      saleDeadlineObj = parseCustomDateTime(saleDeadline);
    }

    if (!dateObj || isNaN(dateObj.getTime())) {
      return badRequest(
        res,
        "Định dạng 'date' không hợp lệ. (Dùng ISO hoặc DD/MM/YYYY HH:mm)"
      );
    }
    if (!saleDeadlineObj || isNaN(saleDeadlineObj.getTime())) {
      return badRequest(res, "Định dạng 'saleDeadline' không hợp lệ.");
    }

    // --- 2. GỌI SERVICE (Sau khi mọi thứ đã OK) ---

    // Dữ liệu đã "sạch"
    const data = await createTicket({
      userId,
      coverFile, // Gửi file buffer
      title,
      location,
      date: dateObj, // Gửi đối tượng Date
      saleDeadline: saleDeadlineObj, // Gửi đối tượng Date
      price: priceNum, // Gửi Number
      maxSupply: maxSupplyNum, // Gửi Number
    });

    // --- 3. TRẢ VỀ ---
    success(res, data);
  })
);

router.post(
  "/log-purchase",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const { eventId, tokenId, txHash } = req.body;
    const data = await logPurchase({ userId, eventId, tokenId, txHash });
    success(res, data);
  })
);

router.get(
  "",
  authenticateToken(false),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const data = await getTickets({ page, limit });
    success(res, data);
  })
);

export default router;
