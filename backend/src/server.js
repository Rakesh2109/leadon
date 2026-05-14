const app = require("./app");
const env = require("./config/env");
const prisma = require("./config/prisma");
const logger = require("./config/logger");
const { startWorker, scheduleReminders } = require("./queues/notificationQueue");

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "LeadOn API listening");
});

// Start BullMQ notification worker (gracefully degrades if Redis is unavailable)
try {
  startWorker();
  scheduleReminders();
  logger.info("Notification worker + reminder scheduler started");
} catch (err) {
  logger.warn({ err }, "Notification worker failed to start — continuing without queue");
}

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
