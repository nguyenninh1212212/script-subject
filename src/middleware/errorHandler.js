import createError from "http-errors";
import { message } from "../model/dto/response.js";

const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || 500;
  const msg = err.message || "Internal Server Error";

  message(res, msg, statusCode);
};

function notFound() {
  return createError(404, "Not Found");
}

function badRequest(msg = "Bad Request") {
  return createError(400, msg);
}

function unauthorized(msg = "Unauthorized") {
  return createError(401, msg);
}

function forbidden(msg = "Forbidden") {
  return createError(403, msg);
}
function alreadyExist(msg = "") {
  return createError(409, msg + " already Exist");
}

export {
  errorHandler,
  notFound,
  badRequest,
  unauthorized,
  forbidden,
  alreadyExist,
};
