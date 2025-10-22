import multer from "multer";

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "application/octet-stream",
];
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const allowedTypesString = ALLOWED_MIME_TYPES.join(", ");
    cb(
      new Error(
        `Định dạng file không hợp lệ. Chỉ chấp nhận: ${allowedTypesString}`
      ),
      false
    );
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

export default upload;
