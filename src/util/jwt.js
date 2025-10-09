import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AES } from "../util/AES.js";

dotenv.config();

export function generateToken(payload, expiresIn = "1h") {
  const { roles, ...rest } = payload;
  return jwt.sign({ roles, data: AES(rest) }, process.env.JWT_SECRET, {
    expiresIn,
  });
}
