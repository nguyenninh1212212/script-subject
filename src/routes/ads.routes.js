import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";
import adsService from "../service/adsService.js";
import { success } from "../model/dto/response.js";
import { badRequest } from "../middleware/errorHandler.js";
import upload from "../middleware/multer.js";

const router = express.Router();

// [GET] /ads/random -> client gọi khi cần hiển thị quảng cáo
router.get(
  "/random",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Ads']

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
    // #swagger.tags = ['Ads']

    const ads = await adsService.getAllAds();
    success(res, ads);
  })
);

router.post(
  "/",
  authenticateToken(true),
  upload.single("adFile"),
  authenticateToken(["admin"]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Ads']
    if (!adFile) badRequest("File need");
    const { type } = req.query;
    // Các trường còn lại lấy từ req.body
    const { title, redirectUrl, startDate, endDate, isActive } = req.body;
    const adFile = req.file;
    const newAd = await adsService.createAd({
      title,
      redirectUrl,
      startDate,
      endDate,
      isActive,
      type,
      adFile,
    });
    success(res, newAd);
  })
);

export default router;
