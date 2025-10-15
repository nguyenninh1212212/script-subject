import express from "express";
import playlistService from "../service/playlistService.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { success } from "../model/dto/response.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Playlist']
    const { name } = req.body;
    const userId = req.user.sub;
    const playlist = await playlistService.createPlaylist({ name, userId });
    success(res, playlist, 201);
  })
);

router.post(
  "/:playlistId/songs/:songId",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Playlist']
    const { playlistId, songId } = req.params;
    const playlist = await playlistService.addSongToPlaylist(
      playlistId,
      songId
    );
    success(res, playlist);
  })
);

router.get(
  "/playlist",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Playlist']
    const playlists = await playlistService.getPlaylistsByUser(req.user.sub);
    success(res, playlists);
  })
);

router.get(`/:id`, async (req, res) => {
  // #swagger.tags = ['Playlist']
  const { id } = req.params;
  const playlist = await playlistService.getPlaylistById(id);
  success(res, playlist);
});

router.delete(
  "/:id",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Playlist']
    const { id } = req.params;
    const userId = req.user.sub;
    await playlistService.deletePlaylist({ id, userId });
    success(res, "Delete playlist success", 204);
  })
);

router.delete(
  "/:playlistId/songs/:songId",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Playlist']
    await playlistService.deletePlaylist(req.params.id);
    success(res, "Delete playlist success", 204);
  })
);

export default router;
