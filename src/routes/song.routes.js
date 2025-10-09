import express from "express";
import songService from "../service/songService.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { success } from "../model/dto/response.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const { title, albumId, duration, url, artistId } = req.body; // fix req.bod -> req.body
    const userId = req.user.sub;

    const song = await songService.createSong({
      title,
      albumId,
      userId,
      artistId,
      duration,
      url,
    });

    success(res, song, 201);
  })
);

router.get(
  "/",

  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']

    const songs = await songService.getSongs();
    success(res, songs);
  })
);
router.get(
  "/:id",
  authenticateToken(false),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const userId = req.user.sub;
    const id = req.params;
    const songs = await songService.getSong({ userId, id });
    success(res, songs);
  })
);

router.post(
  "/remove",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']

    const userId = req.user.sub;
    const { songId } = req.body;
    const result = await songService.removeSong({ userId, songId });
    success(res, result);
  })
);

router.delete(
  "/:id",
  authenticateToken(true),
  authorizeRoles("admin"),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const { id } = req.params;
    await songService.deleteSong(id);
    success(res, null, 204);
  })
);

export default router;
