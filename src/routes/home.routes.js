import { Router } from "express";
import homeService from "../service/homeService.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { success } from "../model/dto/response.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const data = await homeService.home();
    success(res, data, 200);
  })
);

export default router;
