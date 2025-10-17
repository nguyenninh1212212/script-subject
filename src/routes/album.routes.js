import express from "express";
import albumService from "../service/albumService.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { message, success } from "../model/dto/response.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import upload from "../middleware/multer.js";
const router = express.Router();

router.post(
  "/",
  authenticateToken(true),
  upload.single("coverFile"),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Album']
    const userId = req.user.sub;
    const coverFile = req.file;
    const { title } = req.body;
    const album = await albumService.createAlbum({ title, userId, coverFile });
    success(res, album, 201);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Album']
    const { page, size } = req.query;
    const albums = await albumService.getAlbums({ page, size });
    success(res, albums);
  })
);
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Album']
    const { id } = req.params;
    const albums = await albumService.getAlbum({ id });
    success(res, albums);
  })
);

router.delete(
  "/:id",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Album']
    const userId = req.user.sub;
    const { id } = req.params;
    const albums = await albumService.deleteAlbum({ id, userId });
    message(res, "delete success", 204);
  })
);

router.post(
  "/:id/song/:songid",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Album']
    const userId = req.user.sub;
    const { id, songId } = req.params;
    const albums = await albumService.deleteSongAlbum({ id, songId, userId });
    success(res, albums);
  })
);

export default router;
