import { parseBuffer } from "music-metadata";

const getAudioDurationFromBuffer = async (buffer, mimeType) => {
  try {
    const metadata = await parseBuffer(buffer, mimeType);
    const duration = metadata.format.duration; // thời lượng (giây)
    console.log("⏱ Duration:", duration, "seconds");
    return duration;
  } catch (err) {
    console.error("Lỗi đọc metadata:", err.message);
    return null;
  }
};

export { getAudioDurationFromBuffer };
