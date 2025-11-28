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
  getTickets,
  setWallet,
  getMyTickets,
  buyResellTicket,
  getResellTickets,
  listResellTicket,
  updateResellTicketClient,
  updateTicketStatusClient,
  getArtistTicket,
} from "../service/nft/nftService.js";
import { success } from "../model/dto/response.js";
import upload from "../middleware/multer.js";
import { badRequest } from "../middleware/errorHandler.js";

const router = express.Router();

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
    const ads = await setWallet(newWallet);
    success(res, ads);
  })
);

router.post(
  "/create-ticket",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const {
      baseUrl,
      contractAddress,
      date,
      saleDeadline,
      price,
      location,
      title,
      maxSupply,
      coverImage,
    } = req.body;
    const userId = req.user.sub;
    console.log("🚀 ~ contractAddress:", contractAddress);
    console.log("🚀 ~ baseUrl:", baseUrl);

    if (!baseUrl) {
      return badRequest("Vui lòng nhập đầy đủ các trường bắt buộc.");
    }

    // --- 2. GỌI SERVICE (Sau khi mọi thứ đã OK) ---

    // Dữ liệu đã "sạch"
    const data = await createTicket({
      userId,
      baseUrl,
      contractAddress,
      date,
      saleDeadline,
      price,
      location,
      maxSupply,
      title, // Gửi file buffer
      coverImage,
    });

    // --- 3. TRẢ VỀ ---
    success(res, data);
  })
);

router.post(
  "/log-purchase",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const userId = req.user.sub;
    const { eventId, tokenId, txHash } = req.body;
    const data = await logPurchase({ userId, eventId, tokenId, txHash });
    success(res, data);
  })
);
router.post(
  "/update-status/:id",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const data = await updateTicketStatusClient();
    success(res, data);
  })
);
router.get(
  "",
  authenticateToken(false),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']

    const { page, limit } = req.query;
    const data = await getTickets({ page, limit });
    success(res, data);
  })
);
router.get(
  "/my-ticket",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const { page, limit } = req.query;
    const userId = req.user.sub;
    const data = await getMyTickets({ page, limit, userId });
    console.log("🚀 ~ data:", data);
    success(res, data);
  })
);

router.get(
  "/artist-ticket",
  authenticateToken(true),

  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const userId = req.user.sub;
    const { page = 1, limit = 10 } = req.query;
    const data = await getArtistTicket({
      page: parseInt(page),
      limit: parseInt(limit),
      userId: userId,
    });
    success(res, data);
  })
);

// ================================
// 1️⃣ List ticket for resale
// ================================
router.post(
  "/resell",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const sellerId = req.user.sub;
    console.log("🚀 ~ sellerId:", sellerId);
    const { userTicketId, price } = req.body;

    if (!userTicketId || !price) return badRequest(res, "Missing params");

    const data = await listResellTicket({ userTicketId, sellerId, price });
    success(res, data);
  })
);

// ================================
// 2️⃣ Get all tickets listed for resale
// ================================
router.get(
  "/resell",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']

    const { page = 1, limit = 10 } = req.query;
    const data = await getResellTickets({
      page: parseInt(page),
      limit: parseInt(limit),
    });
    success(res, data);
  })
);

// ================================
// 3️⃣ Buy a ticket from resale
// ================================
router.post(
  "/resell/buy",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const buyerId = req.user.sub;
    console.log("🚀 ~ buyerId:", buyerId);
    const { resellTicketId } = req.body;

    if (!resellTicketId) return badRequest(res, "Missing resellTicketId");

    const data = await buyResellTicket({ resellTicketId, buyerId });
    success(res, data);
  })
);

// ================================
// 4️⃣ Update resell ticket status (admin/seller can toggle isSold)
// ================================
router.patch(
  "/resell/:resellId",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const sellerId = req.user.sub;
    const { resellId } = req.params;

    const data = await updateResellTicketClient({ sellerId, resellId });
    success(res, data);
  })
);

export default router;
