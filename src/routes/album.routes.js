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

router.post(
  "/:id/add/song",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Album']

    const userId = req.user.sub;
    const { id } = req.params;
    const { songId } = req.query;
    // The service now returns the updated song
    const updatedSong = await albumService.addSongToAlbum({
      id,
      songId,
      userId,
    });

    // Send a success message or the updated object
    success(res, updatedSong);
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
  "/:id/song",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Album']
    const userId = req.user.sub;
    const { songId } = req.query;
    const albums = await albumService.deleteSongAlbum({ id, songId, userId });
    success(res, albums);
  })
);
router.post(
  "/farvorite/:id",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Album']
    const userId = req.user.sub;
    const { id } = req.params;
    const albums = await albumService.addFavoriteAlbum({ id, userId });
    success(res, albums);
  })
);
router.delete(
  "/farvorite/:id",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Album']
    const userId = req.user.sub;
    const { id } = req.params;
    const albums = await albumService.removeFavoriteAlbum({ id, userId });
    success(res, albums);
  })
);
router.get(
  "/farvorite",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Album']
    const userId = req.user.sub;
    const albums = await albumService.getFavoriteAlbum({ userId });
    success(res, albums);
  })
);

export default router;
