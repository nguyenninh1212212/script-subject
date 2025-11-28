import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AESDecrypt } from "../util/AES.js";
import { unauthorized, forbidden } from "./errorHandler.js";

dotenv.config();

export const authenticateToken =
  (require = true) =>
  (req, res, next) => {
    try {
      const header = req.headers["authorization"];
      const token = header?.split(" ")[1];

      if (!token) {
        if (require) return res.status(401).json({ message: "Unauthorized" });
        return next();
      }

      jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
          if (require) return res.status(401).json({ message: "Unauthorized" });
          return next();
        }
        req.user = AESDecrypt(user.data);
        next();
      });
    } catch (error) {
      next(error);
    }
  };

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) throw unauthorized("Unauthorized");
    if (!req.user.roles.some((role) => allowedRoles.includes(role))) {
      throw forbidden();
    }
    next();
  };
};
