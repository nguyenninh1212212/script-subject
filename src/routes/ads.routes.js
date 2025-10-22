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

router.post(
  "/",
  upload.single("mediaFile"),
  authenticateToken(true),
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Ads']
    const mediaFile = req.file;
    console.log("=== TEST UPLOAD ROUTE ===");
    console.log("content-type:", req.headers["content-type"]);
    console.log("is multipart?:", req.is("multipart/form-data"));
    console.log("file:", !!req.file);
    if (!mediaFile) badRequest("File need");

    const { type } = req.query;

    const { title, redirectUrl, startDate, endDate, isActive } = req.body;

    const newAd = await adsService.createAd({
      title,
      redirectUrl,
      startDate,
      endDate,
      isActive,
      type,
      adFile: mediaFile,
    });
    success(res, newAd);
  })
);

router.get(
  "/random",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Ads']
    const ad = await adsService.getRandomAd();
    success(res, ad || { message: "No active ads available" });
  })
);

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

router.delete(
  "/:id",
  authenticateToken(true),
  authenticateToken("admin"),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Ads']
    const { id } = req.params;
    const ads = await adsService.deletAds({ id });
    success(res, ads);
  })
);

export default router;
