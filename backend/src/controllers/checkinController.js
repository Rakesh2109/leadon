const prisma = require("../config/prisma");
const AppError = require("../utils/appError");

async function listCheckins(req, res, next) {
  try {
    const { status, employeeId, cursor, limit: rawLimit } = req.query;
    const limit = Math.min(parseInt(rawLimit) || 20, 100);
    const where = { organizationId: req.user.organizationId, deletedAt: null };

    if (req.user.role === "EMPLOYEE") where.employeeId = req.user.id;
    else if (req.user.role === "LEADER") where.leaderId = req.user.id;
    if (status) where.status = status;
    if (employeeId && req.user.role !== "EMPLOYEE") where.employeeId = employeeId;

    const rows = await prisma.checkin.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        leader:   { select: { id: true, firstName: true, lastName: true } },
        response: true
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });

    const hasMore = rows.length > limit;
    const checkins = hasMore ? rows.slice(0, limit) : rows;
    res.json({ checkins, nextCursor: hasMore ? checkins[checkins.length - 1].id : null, hasMore });
  } catch (err) { next(err); }
}

async function getCheckin(req, res, next) {
  try {
    const where = { id: req.params.id, organizationId: req.user.organizationId, deletedAt: null };
    if (req.user.role === "EMPLOYEE") where.employeeId = req.user.id;
    else if (req.user.role === "LEADER") where.leaderId = req.user.id;

    const checkin = await prisma.checkin.findFirst({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true } },
        leader:   { select: { id: true, firstName: true, lastName: true } },
        hkmStage: true,
        response: true
      }
    });
    if (!checkin) throw new AppError("Check-in not found", 404);
    res.json({ checkin });
  } catch (err) { next(err); }
}

async function createCheckin(req, res, next) {
  try {
    const { employeeId, title, prompt, hkmStageId, dueAt } = req.validated.body;
    const employee = await prisma.user.findFirst({
      where: { id: employeeId, organizationId: req.user.organizationId, deletedAt: null }
    });
    if (!employee) throw new AppError("Employee not found", 404);

    const [checkin] = await prisma.$transaction([
      prisma.checkin.create({
        data: {
          organizationId: req.user.organizationId,
          leaderId: req.user.id,
          employeeId,
          title,
          prompt,
          hkmStageId: hkmStageId || null,
          status: "SENT",
          sentAt: new Date(),
          dueAt: dueAt ? new Date(dueAt) : null,
          createdById: req.user.id
        }
      }),
      prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: employeeId,
          type: "CHECKIN_REMINDER",
          title: "New Check-in",
          body: `${req.user.firstName} sent you a check-in: "${title.slice(0, 80)}"`,
          status: "PENDING"
        }
      })
    ]);

    res.status(201).json({ checkin });
  } catch (err) { next(err); }
}

// FIXED: entire check-and-respond inside one transaction (no TOCTOU)
async function respondToCheckin(req, res, next) {
  try {
    const { mood, response, needsHelp } = req.validated.body;

    const result = await prisma.$transaction(async (tx) => {
      const checkin = await tx.checkin.findFirst({
        where: { id: req.params.id, employeeId: req.user.id, deletedAt: null }
      });
      if (!checkin) throw new AppError("Check-in not found", 404);
      if (["RESPONDED", "CLOSED"].includes(checkin.status)) {
        throw new AppError("Check-in already responded to", 409);
      }

      const checkinResponse = await tx.checkinResponse.create({
        data: { checkinId: checkin.id, employeeId: req.user.id, mood: mood || null, response, needsHelp: !!needsHelp }
      });
      await tx.checkin.update({ where: { id: checkin.id }, data: { status: "RESPONDED" } });
      return { checkinResponse, leaderId: checkin.leaderId };
    });

    if (needsHelp) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: result.leaderId,
          type: "CHECKIN_REMINDER",
          title: "Employee Needs Help",
          body: `${req.user.firstName} ${req.user.lastName} flagged they need help`,
          status: "PENDING"
        }
      });
    }

    res.json({ response: result.checkinResponse });
  } catch (err) { next(err); }
}

async function listTemplates(req, res, next) {
  try {
    const templates = await prisma.checkinTemplate.findMany({
      where: {
        organizationId: req.user.organizationId,
        deletedAt: null,
        isActive: true
      },
      include: { hkmStage: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" }
    });
    res.json({ templates });
  } catch (err) { next(err); }
}

async function createTemplate(req, res, next) {
  try {
    const { title, prompt, hkmStageId } = req.body;
    if (!title || !prompt) throw new AppError("title and prompt are required", 400);
    const template = await prisma.checkinTemplate.create({
      data: {
        organizationId: req.user.organizationId,
        title: title.slice(0, 200),
        prompt: prompt.slice(0, 2000),
        hkmStageId: hkmStageId || null,
        isActive: true,
        createdById: req.user.id
      },
      include: { hkmStage: { select: { id: true, name: true } } }
    });
    res.status(201).json({ template });
  } catch (err) { next(err); }
}

async function deleteTemplate(req, res, next) {
  try {
    const t = await prisma.checkinTemplate.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId, deletedAt: null }
    });
    if (!t) throw new AppError("Template not found", 404);
    await prisma.checkinTemplate.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ ok: true });
  } catch (err) { next(err); }
}

module.exports = { listCheckins, getCheckin, createCheckin, respondToCheckin, listTemplates, createTemplate, deleteTemplate };
