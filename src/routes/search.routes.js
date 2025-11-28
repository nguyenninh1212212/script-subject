import express from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { success } from "../model/dto/response.js";
import {
  searchData,
  searchAudio,
  autocomplete,
} from "../service/searchService.js";
import upload from "../middleware/multer.js";

const router = express.Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['search']
    const { search, from, size } = req.query;
    const data = await searchData(search, { from, size });
    success(res, data, 200);
  })
);
router.post(
  "/audio",
  upload.single("audioFile"),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['search']
    const audioFile = req.file;
    if (!audioFile) {
      throw new Error("No audio file uploaded");
    }
    const data = await searchAudio(audioFile);
    console.log("🚀 ~ data:", data);
    success(res, data);
  })
);
router.get(
  "/autocomplete",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['search']
    const { q, size } = req.query || "";
    const data = await autocomplete(q, size);
    success(res, data);
  })
);

export default router;
