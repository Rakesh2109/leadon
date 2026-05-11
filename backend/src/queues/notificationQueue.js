const { Queue, Worker } = require("bullmq");
const prisma = require("../config/prisma");
const logger = require("../config/logger");
const { getBullRedis } = require("../config/redis");

const QUEUE_NAME = "notifications";

let queue = null;

function getQueue() {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: getBullRedis() });
  }
  return queue;
}

async function enqueueNotification(data) {
  try {
    await getQueue().add("send", data, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });
  } catch (err) {
    // Redis may be down — fire-and-forget, notification already written to DB
    logger.warn({ err }, "Failed to enqueue notification job");
  }
}

function startWorker() {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { notificationId } = job.data;
      if (!notificationId) return;
      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: "SENT" }
      });
      logger.debug({ notificationId }, "Notification marked SENT");
    },
    { connection: getBullRedis() }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Notification job failed");
  });

  return worker;
}

module.exports = { enqueueNotification, startWorker };
