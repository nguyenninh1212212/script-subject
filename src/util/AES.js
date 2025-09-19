require("dotenv").config();
const crypto = require("crypto");

const key = Buffer.from(process.env.key, "hex"); // 32 bytes
const iv = Buffer.from(process.env.iv, "hex"); // 16 bytes

const AESDecrypt = (body) => {
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(body, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};


const AES = (body) => {
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(JSON.stringify(body), "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
};

module.exports = { AESDecrypt, AES };
