const jwt = require("jsonwebtoken");
require("dotenv").config();

const { AES } = require("../util/AES");

const generateToken = (payload) => {
  return jwt.sign({ data: AES(payload) }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

module.exports = { generateToken };
