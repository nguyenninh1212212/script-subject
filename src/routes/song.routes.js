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
    // #region Swagger
    /* #swagger.tags = ['Song']
    #swagger.summary = 'Upload a new song with its cover image.'
    #swagger.description = 'Endpoint to upload a song file and a cover image, along with song metadata.'
    
    #swagger.consumes = ['multipart/form-data']

    // --- Định nghĩa các trường FILE ---
    #swagger.parameters['songFile'] = {
        in: 'formData',
        type: 'file',
        required: 'true',
        description: 'The audio file of the song.'
    }
    #swagger.parameters['coverFile'] = {
        in: 'formData',
        type: 'file',
        required: 'true',
        description: 'The cover image for the song.'
    }

    // --- BỔ SUNG: Định nghĩa các trường TEXT ---
    #swagger.parameters['title'] = {
        in: 'formData',
        type: 'string',
        required: 'true',
        description: 'Title of the song.'
    }
    #swagger.parameters['albumId'] = {
        in: 'formData',
        type: 'integer',
        description: 'ID of the album this song belongs to (optional).'
    }
    #swagger.parameters['duration'] = {
        in: 'formData',
        type: 'string',
        required: 'true',
        description: 'Duration of the song (e.g., "3:45").'
    }
*/
    // #endregion
    const { title, duration } = req.body;

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
      duration,
    });

    success(res, song, 201);
  })
);

router.get(
  "/",

  asyncHandler(async (req, res) => {
    // #swagger.tags = ['Song']
    const { page = 1, size = 10 } = req.query;
    const songs = await songService.getSongs({ page, size });
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
router.patch(
  "/:id",
  upload.single("coverFile"),
  authenticateToken(true),
  asyncHandler(async (req, res) => {
    // #swagger.start
    /* // Sẽ cập nhật Swagger ở bước 3
     */
    // #swagger.end

    const userId = req.user.sub;
    const { id } = req.params;
    const dataToUpdate = { ...req.body }; // Dữ liệu text từ form
    const coverFile = req.file; // Lấy file đã upload (nếu có)

    // Lọc các trường không cho phép cập nhật
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

export default router;
