import express from "express";
import artistService from "../service/artistService.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { success } from "../model/dto/response.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Artist']
    const userId = req.user.sub;
    const { stageName, bio, avatarUrl } = req.body;
    const artist = await artistService.createArtist({
      userId,
      stageName,
      bio,
      avatarUrl,
    });
    success(res, artist, 201);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Artist']
    const { page, size } = req.params;
    const artists = await artistService.getArtists({ page, size });
    success(res, artists);
  })
);
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Artist']
    const { id } = req.params;
    const artists = await artistService.getArtist({ id: id.id });
    success(res, artists);
  })
);

export default router;
