const prisma = require("../config/prisma");
const AppError = require("../utils/appError");

async function getHkmStages(req, res, next) {
  try {
    const stages = await prisma.hKMStage.findMany({
      where: {
        OR: [{ organizationId: req.user.organizationId }, { organizationId: null }],
        deletedAt: null
      },
      orderBy: { position: "asc" }
    });
    res.json({ stages });
  } catch (err) {
    next(err);
  }
}

async function getEmployeeProgress(req, res, next) {
  try {
    const employeeId = req.params.employeeId || req.user.id;
    if (req.user.role === "EMPLOYEE" && employeeId !== req.user.id) {
      throw new AppError("Forbidden", 403);
    }
    const progress = await prisma.employeeProgress.findMany({
      where: { employeeId, organizationId: req.user.organizationId },
      include: { hkmStage: true },
      orderBy: { createdAt: "desc" }
    });
    res.json({ progress });
  } catch (err) {
    next(err);
  }
}

async function setEmployeeProgress(req, res, next) {
  try {
    const { employeeId, hkmStageId, note, nextStep } = req.validated.body;
    const employee = await prisma.user.findFirst({
      where: { id: employeeId, organizationId: req.user.organizationId, deletedAt: null }
    });
    if (!employee) throw new AppError("Employee not found", 404);
    const record = await prisma.employeeProgress.create({
      data: {
        organizationId: req.user.organizationId,
        employeeId,
        hkmStageId,
        note: note || null,
        nextStep: nextStep || null,
        createdById: req.user.id
      },
      include: { hkmStage: true }
    });
    res.status(201).json({ progress: record });
  } catch (err) {
    next(err);
  }
}

async function getDashboard(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const leaderId = req.user.role === "LEADER" ? req.user.id : undefined;

    const [totalUsers, totalTeams, pendingCheckins, recentMessages, pendingNotifications] =
      await Promise.all([
        prisma.user.count({ where: { organizationId: orgId, deletedAt: null } }),
        prisma.team.count({ where: { organizationId: orgId, ...(leaderId ? { leaderId } : {}), deletedAt: null } }),
        prisma.checkin.count({
          where: { organizationId: orgId, ...(leaderId ? { leaderId } : {}), status: { in: ["SENT", "OVERDUE"] }, deletedAt: null }
        }),
        prisma.message.findMany({
          where: {
            organizationId: orgId,
            OR: [{ senderId: req.user.id }, { recipientId: req.user.id }],
            deletedAt: null
          },
          select: {
            id: true, type: true, createdAt: true,
            sender: { select: { id: true, firstName: true, lastName: true } }
          },
          orderBy: { createdAt: "desc" },
          take: 5
        }),
        prisma.notification.count({
          where: { userId: req.user.id, status: { in: ["PENDING", "SENT"] } }
        })
      ]);

    // Allow browsers/CDN to cache dashboard for 30s
    res.set("Cache-Control", "private, max-age=30");
    res.json({ totalUsers, totalTeams, pendingCheckins, recentMessages, pendingNotifications });
  } catch (err) {
    next(err);
  }
}

async function getMyProgress(req, res, next) {
  req.params.employeeId = req.user.id;
  return getEmployeeProgress(req, res, next);
}

async function getReports(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const leaderId = req.user.role === "LEADER" ? req.user.id : undefined;
    const checkinWhere = { organizationId: orgId, deletedAt: null, ...(leaderId ? { leaderId } : {}) };

    const [
      checkinTotal, checkinResponded,
      learningAssigned, learningCompleted,
      stages, progressRows
    ] = await Promise.all([
      prisma.checkin.count({ where: checkinWhere }),
      prisma.checkin.count({ where: { ...checkinWhere, status: "RESPONDED" } }),
      prisma.learningAssignment.count({
        where: { employee: { organizationId: orgId, deletedAt: null }, deletedAt: null }
      }),
      prisma.learningAssignment.count({
        where: { employee: { organizationId: orgId, deletedAt: null }, deletedAt: null, status: "COMPLETED" }
      }),
      prisma.hKMStage.findMany({
        where: { OR: [{ organizationId: orgId }, { organizationId: null }], deletedAt: null },
        orderBy: { position: "asc" }
      }),
      prisma.employeeProgress.findMany({
        where: { organizationId: orgId },
        select: { hkmStageId: true },
      })
    ]);

    const stageCounts = {};
    for (const p of progressRows) stageCounts[p.hkmStageId] = (stageCounts[p.hkmStageId] || 0) + 1;
    const hkmDistribution = stages.map(s => ({ id: s.id, name: s.name, position: s.position, count: stageCounts[s.id] || 0 }));

    res.json({ checkinTotal, checkinResponded, learningAssigned, learningCompleted, hkmDistribution });
  } catch (err) { next(err); }
}

module.exports = { getHkmStages, getEmployeeProgress, getMyProgress, setEmployeeProgress, getDashboard, getReports };
