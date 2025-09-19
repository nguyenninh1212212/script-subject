const createError = require("http-errors");
const { message } = require("../model/dto/response");

const errorHandler = (err, req, res, next) => {
  if (!err) {
    err = createError(404, "Not Found");
  }

  let statusCode = err.status || 500;
  let msg = err.message || "Internal Server Error";

  if (!err.status) {
    statusCode = 400;
    msg = err.message;
  }

  message(res, msg, statusCode);
};

module.exports = errorHandler;
