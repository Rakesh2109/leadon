const prisma = require("../config/prisma");
const AppError = require("../utils/appError");

async function myNotifications(req, res, next) {
  try {
    const { cursor, limit: rawLimit } = req.query;
    const limit = Math.min(parseInt(rawLimit) || 20, 100);

    const rows = await prisma.notification.findMany({
      where: { userId: req.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });

    const hasMore = rows.length > limit;
    const notifications = hasMore ? rows.slice(0, limit) : rows;
    res.json({ notifications, nextCursor: hasMore ? notifications[notifications.length - 1].id : null, hasMore });
  } catch (err) { next(err); }
}

async function markNotificationRead(req, res, next) {
  try {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id, deletedAt: null }
    });
    if (!notification) throw new AppError("Notification not found", 404);
    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { status: "READ", readAt: new Date() }
    });
    res.json({ notification: updated });
  } catch (err) { next(err); }
}

async function markAllRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, status: { in: ["PENDING", "SENT"] } },
      data: { status: "READ", readAt: new Date() }
    });
    res.json({ message: "All notifications marked as read" });
  } catch (err) { next(err); }
}

module.exports = { myNotifications, markNotificationRead, markAllRead };
