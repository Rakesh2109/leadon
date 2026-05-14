const prisma = require("../config/prisma");
const AppError = require("../utils/appError");

async function sendAnonymousMessage(req, res, next) {
  try {
    const { body, teamId } = req.body;
    const user = req.user;

    const msg = await prisma.anonymousMessage.create({
      data: {
        organizationId: user.organizationId,
        teamId: teamId ?? null,
        body,
      },
    });

    // Return minimal data — no sender info, that's the whole point
    res.status(201).json({ id: msg.id, createdAt: msg.createdAt });
  } catch (err) {
    next(err);
  }
}

async function listAnonymousMessages(req, res, next) {
  try {
    const user = req.user;
    if (user.role === "EMPLOYEE") return next(new AppError("Forbidden", 403));

    const { teamId, status, limit = 20, offset = 0 } = req.query;

    const where = {
      organizationId: user.organizationId,
      ...(teamId && { teamId }),
      ...(status && { status }),
    };

    const [messages, total] = await Promise.all([
      prisma.anonymousMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Number(limit),
        skip: Number(offset),
        select: {
          id: true,
          body: true,
          status: true,
          leaderNote: true,
          readAt: true,
          createdAt: true,
          team: { select: { id: true, name: true } },
        },
      }),
      prisma.anonymousMessage.count({ where }),
    ]);

    res.json({ messages, total });
  } catch (err) {
    next(err);
  }
}

async function updateAnonymousMessage(req, res, next) {
  try {
    const user = req.user;
    if (user.role === "EMPLOYEE") return next(new AppError("Forbidden", 403));

    const { status, leaderNote } = req.body;

    const msg = await prisma.anonymousMessage.findFirst({
      where: { id: req.params.id, organizationId: user.organizationId },
    });
    if (!msg) return next(new AppError("Message not found", 404));

    const updated = await prisma.anonymousMessage.update({
      where: { id: msg.id },
      data: {
        ...(status && { status }),
        ...(leaderNote !== undefined && { leaderNote }),
        ...(status === "READ" && !msg.readAt && { readAt: new Date() }),
      },
    });

    res.json({ message: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { sendAnonymousMessage, listAnonymousMessages, updateAnonymousMessage };
