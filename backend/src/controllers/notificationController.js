const prisma = require("../config/prisma");
const AppError = require("../utils/appError");

async function myNotifications(req, res, next) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    res.json({ notifications });
  } catch (err) {
    next(err);
  }
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
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, status: { in: ["PENDING", "SENT"] } },
      data: { status: "READ", readAt: new Date() }
    });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    next(err);
  }
}

module.exports = { myNotifications, markNotificationRead, markAllRead };
