import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AESDecrypt } from "../util/AES.js";
import { unauthorized, forbidden } from "./errorHandler.js";

dotenv.config();

export const authenticateToken = (req, res, next) => {
  const header = req.headers["authorization"];
  const token = header && header.split(" ")[1];

  if (token == null) throw unauthorized("Unauthorized");

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) throw f;
    req.user = AESDecrypt(user.data);
    next();
  });
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) throw unauthorized("Unauthorized");

    console.log(req.user.roles, allowedRoles);

    if (!req.user.roles.some((role) => allowedRoles.includes(role))) {
      throw forbidden();
    }

    next();
  };
};
