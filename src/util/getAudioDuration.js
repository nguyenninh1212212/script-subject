import { parseBuffer } from "music-metadata";

const getAudioDurationFromBuffer = async (buffer, mimeType) => {
  try {
    const metadata = await parseBuffer(buffer, mimeType);
    const duration = Math.round(metadata.format.duration);
    console.log("⏱ Duration:", duration, "seconds");
    return duration;
  } catch (err) {
    console.error("Lỗi đọc metadata:", err.message);
    return null;
  }
};

export { getAudioDurationFromBuffer };
