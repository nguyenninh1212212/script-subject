import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import adsService from "../service/adsService.js";
import { success } from "../model/dto/response.js";

const router = express.Router();

// [GET] /ads/random -> client gọi khi cần hiển thị quảng cáo
router.get(
  "/random",
  asyncHandler(async (req, res) => {
    const ad = await adsService.getRandomAd();
    success(res, ad || { message: "No active ads available" });
  })
);

// [GET] /ads -> admin xem danh sách quảng cáo
router.get(
  "/",
  authenticateToken(true),
  authenticateToken("admin"),
  asyncHandler(async (req, res) => {
    const ads = await adsService.getAllAds();
    success(res, ads);
  })
);

router.post(
  "/",
  authenticateToken(true),
  authenticateToken("admin"),
  asyncHandler(async (req, res) => {
    const newAd = await adsService.createAd(req.body);
    success(res, newAd);
  })
);

export default router;
