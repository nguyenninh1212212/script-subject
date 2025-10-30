import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import nftService from "../service/nftService.js";
import { success } from "../model/dto/response.js";

const router = express.Router();

router.post(
  "/mint-ticket",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const { userAddress } = req.body;
    const ads = await nftService.mintTicketNFT({ userAddress });
    success(res, ads);
  })
);

export default router;
