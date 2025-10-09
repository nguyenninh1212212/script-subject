import express from "express";
import albumService from "../service/albumService.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { success } from "../model/dto/response.js";

const router = express.Router();

router.post(
  "/",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Album']
    const { title, artistId } = req.body;
    const album = await albumService.createAlbum({ title, artistId });
    success(res, album, 201);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Album']
    const albums = await albumService.getAlbums();
    success(res, albums);
  })
);

export default router;
