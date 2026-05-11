const prisma = require("../config/prisma");
const AppError = require("../utils/appError");

async function sendBoost(req, res, next) {
  try {
    const { recipientId, message, category, categoryLabel } = req.body;
    const sender = req.user;

    const recipient = await prisma.user.findFirst({
      where: { id: recipientId, organizationId: sender.organizationId, deletedAt: null },
    });
    if (!recipient) return next(new AppError("Recipient not found", 404));
    if (recipientId === sender.id) return next(new AppError("Cannot send a boost to yourself", 400));

    const boost = await prisma.boost.create({
      data: {
        organizationId: sender.organizationId,
        senderId: sender.id,
        recipientId,
        message,
        category,
        categoryLabel: categoryLabel ?? null,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true } },
        recipient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    res.status(201).json({ boost });
  } catch (err) {
    next(err);
  }
}

async function listBoosts(req, res, next) {
  try {
    const { recipientId, category, limit = 20, offset = 0 } = req.query;
    const user = req.user;

    // Employees see their own boosts; leaders/admins can query by recipientId
    const targetRecipientId =
      user.role === "EMPLOYEE" ? user.id : (recipientId ?? undefined);

    const where = {
      organizationId: user.organizationId,
      deletedAt: null,
      ...(targetRecipientId && { recipientId: targetRecipientId }),
      ...(category && { category }),
    };

    const [boosts, total] = await Promise.all([
      prisma.boost.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip: Number(offset),
        include: {
          sender: { select: { id: true, firstName: true, lastName: true } },
          recipient: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.boost.count({ where }),
    ]);

    res.json({ boosts, total });
  } catch (err) {
    next(err);
  }
}

async function markBoostRead(req, res, next) {
  try {
    const boost = await prisma.boost.findFirst({
      where: { id: req.params.id, recipientId: req.user.id, deletedAt: null },
    });
    if (!boost) return next(new AppError("Boost not found", 404));

    const updated = await prisma.boost.update({
      where: { id: boost.id },
      data: { readAt: boost.readAt ?? new Date() },
    });

    res.json({ boost: updated });
  } catch (err) {
    next(err);
  }
}

async function deleteBoost(req, res, next) {
  try {
    const boost = await prisma.boost.findFirst({
      where: { id: req.params.id, senderId: req.user.id, deletedAt: null },
    });
    if (!boost) return next(new AppError("Boost not found", 404));

    await prisma.boost.update({ where: { id: boost.id }, data: { deletedAt: new Date() } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { sendBoost, listBoosts, markBoostRead, deleteBoost };
