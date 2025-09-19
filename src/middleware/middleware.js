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
    console.log(user);
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
