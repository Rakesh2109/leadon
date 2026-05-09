const AppError = require("../utils/appError");

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to access this resource", 403));
    }

    return next();
  };
}

module.exports = authorize;
