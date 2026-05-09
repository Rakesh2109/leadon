const prisma = require("../config/prisma");
const AppError = require("../utils/appError");
const { verifyToken } = require("../utils/auth");

async function authenticate(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw new AppError("Authentication required", 401);
    }

    const token = authorization.slice("Bearer ".length);
    const payload = verifyToken(token);

    const user = await prisma.user.findFirst({
      where: {
        id: payload.sub,
        deletedAt: null
      }
    });

    if (!user) {
      throw new AppError("Authenticated user was not found", 401);
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new AppError("Invalid or expired token", 401));
    }

    return next(error);
  }
}

module.exports = authenticate;
