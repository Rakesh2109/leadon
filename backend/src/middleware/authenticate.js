const prisma = require("../config/prisma");
const getRedis = require("../config/redis");
const AppError = require("../utils/appError");
const { verifyToken } = require("../utils/auth");
const logger = require("../config/logger");

async function authenticate(req, res, next) {
  try {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith("Bearer ")) {
      throw new AppError("Authentication required", 401);
    }

    const token = authorization.slice("Bearer ".length);
    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }

    // Try Redis cache first (5-min TTL — reduces DB load drastically)
    let user = null;
    const cacheKey = `user:${payload.sub}`;
    try {
      const redis = getRedis();
      const cached = await redis.get(cacheKey);
      if (cached) user = JSON.parse(cached);
    } catch (redisErr) {
      logger.warn({ err: redisErr }, "Redis unavailable, falling back to DB for auth");
    }

    if (!user) {
      user = await prisma.user.findFirst({ where: { id: payload.sub, deletedAt: null } });
      if (!user) throw new AppError("User not found", 401);
      try {
        const redis = getRedis();
        await redis.setex(cacheKey, 300, JSON.stringify(user));
      } catch {}
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = authenticate;
