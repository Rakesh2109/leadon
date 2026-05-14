const Redis = require("ioredis");
const logger = require("./logger");

let redis = null;

function makeRedis(opts = {}) {
  const client = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
    lazyConnect: true,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      // Stop retrying after 3 attempts; log once, not on every attempt
      if (times === 1) logger.warn("Redis unavailable — running without cache/queue");
      if (times > 3) return null; // stop retrying
      return Math.min(times * 500, 2000);
    },
    ...opts
  });

  client.on("connect", () => logger.info("Redis connected"));
  client.on("error", () => {}); // silenced — retryStrategy logs once; must be attached before any caller adds listeners
  return client;
}

// Shared client for auth cache (allows maxRetriesPerRequest)
function getRedis() {
  if (!redis) redis = makeRedis({ maxRetriesPerRequest: 3 });
  return redis;
}

// BullMQ requires maxRetriesPerRequest: null — separate connection
function getBullRedis() {
  return makeRedis({ maxRetriesPerRequest: null });
}

module.exports = getRedis;
module.exports.getBullRedis = getBullRedis;
