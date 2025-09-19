const jwt = require("jsonwebtoken");
const createError = require("http-errors");

require("dotenv").config();
const { AESDecrypt } = require("../util/AES");

const authenticateToken = (req, res, next) => {
  const header = req.headers["authorization"];
  const token = header && header.split(" ")[1];

  if (token == null) throw createError(401, "No token provided");
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) throw createError(403, "forbiden");
    req.user = AESDecrypt(user.data);
    next();
  });
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) throw createError(401, "Unauthorized");
    console.log(req.user.roles + " " + allowedRoles);
    if (!req.user.roles.some((role) => allowedRoles.includes(role)))
      throw createError(403, "Forbidden");

    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };
