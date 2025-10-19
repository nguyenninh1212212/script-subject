import express from "express";
import artistService from "../service/artistService.js";
import followService from "../service/followService.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { message, success } from "../model/dto/response.js";
import upload from "../middleware/multer.js";

const router = express.Router();

router.post(
  "/",
  upload.fields([
    { name: "avatarFile", maxCount: 1 },
    { name: "bannerFile", maxCount: 1 },
  ]),
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Artist']

    const userId = req.user.sub;
    const files = req.files;
    const avatarFile = files.avatarFile[0];
    const bannerFile = files.bannerFile[0];
    const { stageName, bio, youtubeUrl, facebookUrl, instagramUrl } = req.body;

    await artistService.createArtist({
      userId,
      stageName,
      bio,
      avatarFile,
      bannerFile,
      socialMedia: { youtubeUrl, facebookUrl, instagramUrl },
    });
    message(res, "Artist created successfully!! ✅", 201);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Artist']
    const { page, size } = req.query;
    success(res, await artistService.getArtists({ page, size }));
  })
);

router.get(
  "/me",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Artist']
    const userId = req.user.sub;
    const data = await artistService.myArtist(userId);
    success(res, data);
  })
);

router.put(
  "/me",
  authenticateToken(true),
  upload.fields([
    { name: "avatarFile", maxCount: 1 },
    { name: "bannerFile", maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Artist']
    const userId = req.user.sub;
    const files = req.files;
    const avatarFile = files?.avatarFile?.[0];
    const bannerFile = files?.bannerFile?.[0];
    const { stageName, bio, youtubeUrl, facebookUrl, instagramUrl } = req.body;

    // Gọi service update artist
    const updatedArtist = await artistService.updateArtist({
      userId,
      stageName,
      bio,
      avatarFile,
      bannerFile,
      socialMedia: { youtubeUrl, facebookUrl, instagramUrl },
    });

    success(res, updatedArtist, "Artist updated successfully ✅");
  })
);

router.get(
  "/myFollowers",
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Artist']
    const userId = req.user.sub;
    const { page, size } = req.query;
    await followService.myFollowers(userId, { page, size });
    success(res, artist);
  })
);

router.get(
  "/follows",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Artist']
    const userId = req.user.sub;
    const { page, size } = req.query;
    await followService.artistFollow(userId, { page, size });
    success(res, artist);
  })
);

router.get(
  "/:id",
  authenticateToken(false),
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Artist']
    const { id } = req.params;
    const userId = req.user ? req.user.sub : null;
    const artists = await artistService.getArtist({ id, userId });
    success(res, artists);
  })
);

router.post(
  "/follow/:id",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Artist']
    const userId = req.user.sub;
    const { id } = req.params;
    await followService.follow({ userId, artistId: id });
    success(res, artist);
  })
);
router.delete(
  "/unfollow/:id",
  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Artist']
    const userId = req.user.sub;
    const { id } = req.params;
    await followService.unFollow({ userId, artistId: id });
    success(res, artist);
  })
);

export default router;
