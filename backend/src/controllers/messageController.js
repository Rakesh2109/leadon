const prisma = require("../config/prisma");
const AppError = require("../utils/appError");

async function listMessages(req, res, next) {
  try {
    const { withUserId, cursor, limit: rawLimit } = req.query;
    const limit = Math.min(parseInt(rawLimit) || 30, 100);
    const where = {
      organizationId: req.user.organizationId,
      deletedAt: null,
      OR: [{ senderId: req.user.id }, { recipientId: req.user.id }]
    };
    if (withUserId) {
      where.OR = [
        { senderId: req.user.id, recipientId: withUserId },
        { senderId: withUserId, recipientId: req.user.id }
      ];
    }

    const rows = await prisma.message.findMany({
      where,
      include: {
        sender:    { select: { id: true, firstName: true, lastName: true } },
        recipient: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: "asc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });

    const hasMore = rows.length > limit;
    const messages = hasMore ? rows.slice(0, limit) : rows;
    res.json({ messages, nextCursor: hasMore ? messages[messages.length - 1].id : null, hasMore });
  } catch (err) { next(err); }
}

async function sendMessage(req, res, next) {
  try {
    const { recipientId, body, type } = req.validated.body;
    const recipient = await prisma.user.findFirst({
      where: { id: recipientId, organizationId: req.user.organizationId, deletedAt: null }
    });
    if (!recipient) throw new AppError("Recipient not found", 404);

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          organizationId: req.user.organizationId,
          senderId: req.user.id,
          recipientId,
          body,
          type: type || "GENERAL"
        }
      }),
      prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: recipientId,
          type: "NEW_MESSAGE",
          title: `New ${type || "Message"} from ${req.user.firstName}`,
          body: body.slice(0, 100),
          status: "PENDING"
        }
      })
    ]);

    res.status(201).json({ message });
  } catch (err) { next(err); }
}

async function markRead(req, res, next) {
  try {
    const message = await prisma.message.findFirst({
      where: { id: req.params.id, recipientId: req.user.id, deletedAt: null }
    });
    if (!message) throw new AppError("Message not found", 404);
    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { readAt: new Date() }
    });
    res.json({ message: updated });
  } catch (err) { next(err); }
}

module.exports = { listMessages, sendMessage, markRead };
