import express from "express";
import artistService from "../service/artistService.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import asyncHandler from "../middleware/asyncHandler.js";
import { message, success } from "../model/dto/response.js";
import upload from "../middleware/multer.js";

const router = express.Router();

router.post(
  "/",
  upload.single("avatarFile"),
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #region Swagger
    /* #swagger.tags = ['Artist']
       #swagger.consumes = ['multipart/form-data']

       #swagger.parameters['avatarFile'] = {
           in: 'formData',
           type: 'file',
           required: true,
           description: 'Artist avatar image.'
       }

       #swagger.parameters['stageName'] = {
           in: 'formData',
           type: 'string',
           required: true,
           description: 'Stage name of the artist.'
       }

       #swagger.parameters['bio'] = {
           in: 'formData',
           type: 'string',
           required: false,
           description: 'Short biography.'
       }
    */
    // #endregion

    const userId = req.user.sub;
    const avatarFile = req.file;
    const { stageName, bio } = req.body;

    await artistService.createArtist({
      userId,
      stageName,
      bio,
      avatarFile,
    });

    message(res, "Artist created successfully!! ✅", 201);
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

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = req.user.sub;
    const artist = await artistService.myArtist({ userId });
    success(res, artist);
  })
);

export default router;
