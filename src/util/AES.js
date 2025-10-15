import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const key = Buffer.from(process.env.key, "hex");

function AES(body) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(body), "utf8"),
    cipher.final(),
  ]);

  return Buffer.concat([iv, encrypted]).toString("base64");
}

function AESDecrypt(data) {
  const dataBuffer = Buffer.from(data, "base64");
  const iv = dataBuffer.subarray(0, 16);
  const encryptedText = dataBuffer.subarray(16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
}

export { AES, AESDecrypt };
