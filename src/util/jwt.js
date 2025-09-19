const jwt = require("jsonwebtoken");
require("dotenv").config();
const crypto = require("crypto");

const { AES } = require("../util/AES");

const generateToken = (payload) => {
  return jwt.sign(AES(payload), process.env.JWT_SECRET);
};

module.exports = { generateToken };
