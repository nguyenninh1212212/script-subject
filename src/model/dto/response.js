// src/utils/responseHandler.js
function success(res, data, status = 200) {
  return res.json({
    status: status,
    data: data,
  });
}

function message(res, message, status = 200) {
  return res.status(status).json({
    message,
    status,
  });
}
module.exports = { success, message };
