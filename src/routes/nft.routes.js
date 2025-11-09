import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import nftService from "../service/nftService.js";
import { success } from "../model/dto/response.js";
import upload from "../middleware/multer.js";

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

router.post(
  "/set-fee",
  authenticateToken(true),
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const { newFee } = req.body;
    const ads = await nftService.setFee(newFee);
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
    const ads = await nftService.setWaller(newWallet);
    success(res, ads);
  })
);

router.post(
  "/set-wallet",
  authenticateToken(true),
  upload.single("coverFile"),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const coverFile = req.file;
    const { newWallet, title, date, location } = req.body;
    const ads = await nftService.creaticket({
      newWallet,
      coverFile,
      title,
      date,
      location,
    });
    success(res, ads);
  })
);
router.get(
  "/user-tickets",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const userId = req.user.sub;
    const data = await nftService.getTicketsByUser(userId);
    success(res, data);
  })
);
router.get(
  "/artist-tickets",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['NFT']
    const userId = req.user.sub;
    const data = await nftService.getTicketsByArtist(userId);
    success(res, data);
  })
);

export default router;
