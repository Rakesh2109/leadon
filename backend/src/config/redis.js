const Redis = require("ioredis");
const logger = require("./logger");

let redis;

function getRedis() {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redis.on("connect", () => logger.info("Redis connected"));
    redis.on("error", (err) => logger.error({ err }, "Redis error"));
    redis.on("close", () => logger.warn("Redis connection closed"));
  }
  return redis;
}

module.exports = getRedis;
