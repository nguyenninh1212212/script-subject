require("dotenv").config();
const crypto = require("crypto");

const key = Buffer.from(process.env.key, "hex");

const AESDecrypt = (data) => {
  const dataBuffer = Buffer.from(data, "base64");

  const iv = dataBuffer.slice(0, 16);
  const encryptedText = dataBuffer.slice(16);

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encryptedText, undefined, "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
};

const AES = (body) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  let encrypted = cipher.update(JSON.stringify(body), "utf8", "base64");
  encrypted += cipher.final("base64");

  const result = Buffer.concat([iv, Buffer.from(encrypted, "base64")]).toString(
    "base64"
  );
  return result;
};

module.exports = { AESDecrypt, AES };
