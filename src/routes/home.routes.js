import express from "express";
import homeService from "../service/homeService.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { success } from "../model/dto/response.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  authenticateToken(false),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Home']
    const data = await homeService.home(req);
    success(res, data, 200);
  })
);

export default router;
