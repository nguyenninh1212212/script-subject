import createError from "http-errors";
import { message } from "../model/dto/response.js";

const errorHandler = (err, req, res, next) => {
  const statusCode = err.status || 500;
  const msg = err.message || "Internal Server Error";

  message(res, msg, statusCode);
};

export default errorHandler;

function notFound(msg = "") {
  throw createError(404, msg + "Not Found");
}

function badRequest(msg = "Bad Request") {
  throw createError(400, msg);
}

function unauthorized(msg = "Unauthorized") {
  throw createError(401, msg);
}

function forbidden(msg = "Forbidden") {
  throw createError(403, msg);
}

function alreadyExist(msg = "") {
  throw createError(409, msg + " already Exist");
}

export { notFound, badRequest, unauthorized, forbidden, alreadyExist };
