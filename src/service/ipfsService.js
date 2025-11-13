import axios from "axios";
import FormData from "form-data";
import * as dotenv from "dotenv";
dotenv.config(); // Đảm bảo .env được đọc

// Đọc một key duy nhất từ .env
const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_URL = "https://api.pinata.cloud";

if (!PINATA_JWT) {
  console.error(
    "LỖI: PINATA_JWT không được tìm thấy trong file .env. Vui lòng kiểm tra lại."
  );
  console.error(
    "Hãy vào Pinata, tạo 'New Key', và copy 'JWT' (chuỗi dài bắt đầu bằng eyJ...)"
  );
}

const uploadFileToIPFS = async (buffer, fileName) => {
  console.log("Uploading file to IPFS (using JWT)...");
  const formData = new FormData();
  formData.append("file", buffer, fileName);

  try {
    const response = await axios.post(
      `${PINATA_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        maxBodyLength: "Infinity", // Cho phép upload file lớn
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    console.log("File uploaded, CID:", response.data.IpfsHash);
    return response.data.IpfsHash; // Đây là CID của file ảnh
  } catch (error) {
    console.error("Error uploading FILE to Pinata (JWT):", error.message);
    if (error.response && error.response.status === 403) {
      console.error(
        "Lỗi 403: Key JWT của bạn không đúng hoặc không có quyền 'pinFileToIPFS'."
      );
    }
    throw new Error("Failed to upload file to IPFS");
  }
};

/**
 * Upload JSON (metadata) lên IPFS (Dùng JWT)
 * @param {object} metadata - Object JSON chứa (name, description, image)
 * @returns {Promise<string>} - Trả về CID (ví dụ: Qm...)
 */
const uploadJSONToIPFS = async (metadata) => {
  console.log("Uploading metadata to IPFS (using JWT)...");
  try {
    const response = await axios.post(
      `${PINATA_URL}/pinning/pinJSONToIPFS`,
      metadata,
      {
        headers: {
          // SỬA LỖI: Xóa key/secret cũ, dùng 'Authorization'
          Authorization: `Bearer ${PINATA_JWT}`,
        },
      }
    );

    console.log("Metadata uploaded, CID:", response.data.IpfsHash);
    return response.data.IpfsHash; // Đây là CID của file JSON
  } catch (error) {
    console.error("Error uploading JSON to Pinata (JWT):", error.message);
    if (error.response && error.response.status === 403) {
      console.error(
        "Lỗi 403: Key JWT của bạn không đúng hoặc không có quyền 'pinJSONToIPFS'."
      );
    }
    throw new Error("Failed to upload metadata to IPFS");
  }
};

export { uploadFileToIPFS, uploadJSONToIPFS };
