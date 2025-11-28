import streamifier from "streamifier";
import client from "../config/cloudinary.config.js";
import { badRequest } from "../middleware/errorHandler.js";

const uploadFromBuffer = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

const deleteFromCloudinary = async (publicId) => {
  if (!publicId) {
    return;
  }

  try {
    const result = await client.uploader.destroy(publicId);
    return result;
  } catch (error) {
    badRequest(error);
  }
};

const getUrlCloudinary = async (public_id) => {
  if (!public_id) return null;

  const isVideo =
    public_id.startsWith("songs/") ||
    public_id.endsWith(".mp4") ||
    public_id.endsWith(".mp3") ||
    public_id.endsWith(".mov") ||
    public_id.endsWith(".webm");

  return client.url(public_id, {
    secure: true,
    resource_type: isVideo ? "video" : "image",
  });
};
export { uploadFromBuffer, deleteFromCloudinary, getUrlCloudinary };
