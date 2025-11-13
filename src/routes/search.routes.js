import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler.js";
import { success } from "../model/dto/response.js";
import { searchData } from "../service/searchService.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['search']
    const { search } = req.query;
    const data = await searchData(search);
    success(res, data, 200);
  })
);

export default router;
