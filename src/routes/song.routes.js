import express from "express";

import songService from "../service/songService.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { message, success } from "../model/dto/response.js";
import upload from "../middleware/multer.js";
import {
  authenticateToken,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  upload.fields([
    { name: "songFile", maxCount: 1 },
    { name: "coverFile", maxCount: 1 },
  ]),
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    const { title } = req.body;

    const files = req.files;
    if (!files || !files.songFile || !files.coverFile) {
      badRequest("Both songFile and coverFile are required.");
    }

    const songFile = files.songFile[0];
    const coverFile = files.coverFile[0];

    const userId = req.user.sub;

    const song = await songService.createSong({
      title,
      userId,
      songFile,
      coverFile,
    });

    success(res, song, 201);
  })
);

router.get(
  "/",
  authenticateToken(false),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const userId = req.user ? req.user.sub : null;
    const { page = 1, size = 10 } = req.query;
    const songs = await songService.getSongs({ page, size }, userId);
    success(res, songs);
  })
);
router.get(
  "/trash",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const userId = req.user.sub;
    const songs = await songService.getTrashSongs({ userId });
    success(res, songs);
  })
);

router.get(
  "/favorite",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const { page = 1, size = 10 } = req.query;
    const userId = req.user.sub;
    const favourites = await songService.getFavourite({ userId }, page, size);
    success(res, favourites);
  })
);
router.delete(
  "/favorite",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const { songId } = req.query;
    console.log("🚀 ~ songId:", songId);
    const userId = req.user.sub;
    await songService.deleteFavourite({ userId, id: songId });
    message(res, "success");
  })
);

router.post(
  "/remove",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const userId = req.user.sub;
    const { songId } = req.body;
    await songService.removeSong({ userId, songId });
    message(res, "Remove success");
  })
);
router.post(
  "/restore",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const userId = req.user.sub;
    const { id } = req.body;
    await songService.restoreSong({ userId, id });
    message(res, "Restore success");
  })
);
router.get(
  "/history",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['songs']
    const userId = req.user.sub;
    const data = await songService.getUserHistory(userId);
    success(res, data, 200);
  })
);
router.get(
  "/recommend",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const userId = req.user?.sub;
    const data = await songService.recommendForUser(userId, 10);
    success(res, data);
  })
);
router.get(
  "/top",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const data = await songService.getTopSongs();
    success(res, data);
  })
);
router.get(
  "/manager",
  authenticateToken(true),
  authorizeRoles("admin", "staff"),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const data = await songService.getSongManager();
    success(res, data);
  })
);
router.get(
  "/artist/:artistId",
  authenticateToken(false),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const { artistId } = req.params;
    const userId = req.user ? req.user.sub : null;
    const { page = 1, size = 10 } = req.query;
    const songs = await songService.getSongsByArtist({
      page,
      size,
      artistId,
    });

    success(res, songs);
  })
);
router.get(
  "/:id",
  authenticateToken(false),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const userId = req.user?.sub || null;
    const { id } = req.params;
    const songs = await songService.getSong({ userId, id });
    success(res, songs);
  })
);

router.delete(
  "/:id",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const { id } = req.params;
    await songService.deleteSong(id);
    success(res, null, 204);
  })
);
router.patch(
  "/:id",
  upload.single("coverFile"),
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']

    const userId = req.user.sub;
    const { id } = req.params;
    const dataToUpdate = { ...req.body };
    const coverFile = req.file;

    delete dataToUpdate.id;
    delete dataToUpdate.artistId;

    if (Object.keys(dataToUpdate).length === 0 && !coverFile) {
      return badRequest(res, "No data or file provided for update.");
    }

    await songService.updateSong({
      id,
      userId,
      data: dataToUpdate,
      coverFile: coverFile,
    });

    message(res, "Update success", 200);
  })
);

router.post(
  "/favorite/:songId",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const userId = req.user.sub;
    const { songId } = req.params;
    await songService.addToFavoutite({ userId, songId });
    message(res, "success");
  })
);
router.get(
  "/recommend/:songId",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const { songId } = req.params;
    const data = await songService.recommendByAudio(songId);
    success(res, data);
  })
);

export default router;
