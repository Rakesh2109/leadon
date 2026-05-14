const app = require("./app");
const env = require("./config/env");
const prisma = require("./config/prisma");
const logger = require("./config/logger");
const { execSync } = require("child_process");
const { startWorker, scheduleReminders } = require("./queues/notificationQueue");

// Run pending migrations automatically on startup
try {
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
  logger.info("Prisma migrations applied");
} catch (err) {
  logger.error({ err }, "Migration failed — server may be unstable");
}

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "LeadOn API listening");
});

// Start BullMQ notification worker only if Redis is reachable
const net = require("net");
const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379");
const probe = net.createConnection({ host: redisHost, port: redisPort });
probe.setTimeout(1000);
probe.on("connect", () => {
  probe.destroy();
  try {
    startWorker();
    scheduleReminders();
    logger.info("Notification worker + reminder scheduler started");
  } catch (err) {
    logger.warn({ err }, "Notification worker failed to start");
  }
});
probe.on("error", () => {
  probe.destroy();
  logger.warn("Redis unavailable — notification worker disabled");
});
probe.on("timeout", () => {
  probe.destroy();
  logger.warn("Redis timeout — notification worker disabled");
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Shutdown initiated");

  // Force-exit after 10s if graceful shutdown hangs
  const forceExit = setTimeout(() => {
    logger.error("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info("Prisma disconnected");
    } catch (err) {
      logger.error({ err }, "Error during prisma disconnect");
    }
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  // Redis/BullMQ connection errors are non-fatal — log and continue
  const msg = reason?.message || String(reason);
  if (msg.includes("ECONNREFUSED") || msg.includes("Redis") || msg.includes("redis")) {
    logger.warn({ reason }, "Unhandled Redis rejection — continuing");
    return;
  }
  logger.error({ reason }, "Unhandled promise rejection");
  shutdown("UNHANDLED_REJECTION");
});

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
  shutdown("UNCAUGHT_EXCEPTION");
});
