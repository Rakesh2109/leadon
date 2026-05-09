const AppError = require("../utils/appError");

function notFound(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";

  if (!err.isOperational) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: {
      message: statusCode === 500 && isProduction ? "Internal server error" : err.message,
      details: err.details
    }
  });
}

module.exports = {
  notFound,
  errorHandler
};
