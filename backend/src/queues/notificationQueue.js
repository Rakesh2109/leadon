const { Queue, Worker, QueueScheduler } = require("bullmq");
const prisma = require("../config/prisma");
const logger = require("../config/logger");
const { getBullRedis } = require("../config/redis");
const { sendPush } = require("../services/fcmService");

const QUEUE_NAME = "notifications";
const REMINDER_QUEUE = "reminders";

let queue = null;
let reminderQueue = null;

function getQueue() {
  if (!queue) queue = new Queue(QUEUE_NAME, { connection: getBullRedis() });
  return queue;
}

function getReminderQueue() {
  if (!reminderQueue) reminderQueue = new Queue(REMINDER_QUEUE, { connection: getBullRedis() });
  return reminderQueue;
}

async function enqueueNotification(data) {
  try {
    await getQueue().add("send", data, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });
  } catch (err) {
    logger.warn({ err }, "Failed to enqueue notification job");
  }
}

async function scheduleReminders() {
  try {
    const rq = getReminderQueue();
    // Run checkin overdue scan every 6 hours
    await rq.add("checkin-overdue", {}, {
      repeat: { every: 6 * 60 * 60 * 1000 },
      jobId: "checkin-overdue-repeat"
    });
    // Run leader nudge scan every 24 hours
    await rq.add("leader-nudge", {}, {
      repeat: { every: 24 * 60 * 60 * 1000 },
      jobId: "leader-nudge-repeat"
    });
    logger.info("Reminder schedules registered");
  } catch (err) {
    logger.warn({ err }, "Failed to schedule reminder jobs — Redis may be unavailable");
  }
}

function startWorker() {
  // Notification worker — marks DB record sent + fires FCM push
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { notificationId } = job.data;
      if (!notificationId) return;

      const notif = await prisma.notification.findUnique({
        where: { id: notificationId },
        include: { user: { select: { firebaseToken: true } } }
      });
      if (!notif) return;

      await prisma.notification.update({
        where: { id: notificationId },
        data: { status: "SENT", sentAt: new Date() }
      });

      // Fire FCM if user has a registered device token
      if (notif.user?.firebaseToken) {
        await sendPush(notif.user.firebaseToken, { title: notif.title, body: notif.body });
      }

      logger.debug({ notificationId }, "Notification sent");
    },
    { connection: getBullRedis() }
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Notification job failed");
  });
  worker.on("error", (err) => {
    logger.warn({ err }, "Notification worker connection error");
  });

  // Reminder worker — creates notifications for overdue items
  const reminderWorker = new Worker(
    REMINDER_QUEUE,
    async (job) => {
      if (job.name === "checkin-overdue") {
        await processOverdueCheckins();
      } else if (job.name === "leader-nudge") {
        await processLeaderNudges();
      }
    },
    { connection: getBullRedis() }
  );

  reminderWorker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Reminder job failed");
  });
  reminderWorker.on("error", (err) => {
    logger.warn({ err }, "Reminder worker connection error");
  });

  return worker;
}

async function processOverdueCheckins() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
  const stale = await prisma.checkin.findMany({
    where: { status: "SENT", sentAt: { lt: cutoff }, deletedAt: null },
    include: { employee: { select: { id: true, firstName: true, organizationId: true } } }
  });

  for (const c of stale) {
    await prisma.$transaction([
      prisma.checkin.update({ where: { id: c.id }, data: { status: "OVERDUE" } }),
      prisma.notification.create({
        data: {
          organizationId: c.organizationId,
          userId: c.employeeId,
          type: "CHECKIN_REMINDER",
          title: "Check-in Reminder",
          body: `Your check-in "${c.title.slice(0, 60)}" is overdue. Please respond when you can.`,
          status: "PENDING"
        }
      })
    ]);
  }
  if (stale.length > 0) logger.info({ count: stale.length }, "Marked check-ins overdue + notified employees");
}

async function processLeaderNudges() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Find leaders who haven't sent a check-in in 7 days
  const orgs = await prisma.organization.findMany({ where: { deletedAt: null }, select: { id: true } });

  for (const org of orgs) {
    const leaders = await prisma.user.findMany({
      where: { organizationId: org.id, role: { in: ["LEADER", "ADMIN"] }, deletedAt: null }
    });

    for (const leader of leaders) {
      const recent = await prisma.checkin.count({
        where: { leaderId: leader.id, createdAt: { gte: sevenDaysAgo }, deletedAt: null }
      });
      if (recent === 0) {
        await prisma.notification.create({
          data: {
            organizationId: org.id,
            userId: leader.id,
            type: "LEADER_NUDGE",
            title: "Team Check-in Reminder",
            body: "You haven't sent a check-in in 7 days. A quick message keeps your team engaged.",
            status: "PENDING"
          }
        });
      }
    }
  }
  logger.info("Leader nudge scan complete");
}

module.exports = { enqueueNotification, startWorker, scheduleReminders };
