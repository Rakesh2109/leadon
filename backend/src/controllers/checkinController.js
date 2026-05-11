const prisma = require("../config/prisma");
const AppError = require("../utils/appError");

async function listCheckins(req, res, next) {
  try {
    const { status, employeeId } = req.query;
    const where = { organizationId: req.user.organizationId, deletedAt: null };

    if (req.user.role === "EMPLOYEE") {
      where.employeeId = req.user.id;
    } else if (req.user.role === "LEADER") {
      where.leaderId = req.user.id;
    }
    if (status) where.status = status;
    if (employeeId && req.user.role !== "EMPLOYEE") where.employeeId = employeeId;

    const checkins = await prisma.checkin.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        leader: { select: { id: true, firstName: true, lastName: true } },
        response: true
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ checkins });
  } catch (err) {
    next(err);
  }
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
        leader: { select: { id: true, firstName: true, lastName: true } },
        hkmStage: true,
        response: true
      }
    });
    if (!checkin) throw new AppError("Check-in not found", 404);
    res.json({ checkin });
  } catch (err) {
    next(err);
  }
}

async function createCheckin(req, res, next) {
  try {
    const { employeeId, title, prompt, hkmStageId, dueAt } = req.validated.body;
    const employee = await prisma.user.findFirst({
      where: { id: employeeId, organizationId: req.user.organizationId, deletedAt: null }
    });
    if (!employee) throw new AppError("Employee not found", 404);

    const checkin = await prisma.checkin.create({
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
    });

    // Create a notification for the employee
    await prisma.notification.create({
      data: {
        organizationId: req.user.organizationId,
        userId: employeeId,
        type: "CHECKIN_REMINDER",
        title: "New Check-in",
        body: `${req.user.firstName} sent you a check-in: "${title}"`,
        status: "PENDING"
      }
    });

    res.status(201).json({ checkin });
  } catch (err) {
    next(err);
  }
}

async function respondToCheckin(req, res, next) {
  try {
    const checkin = await prisma.checkin.findFirst({
      where: { id: req.params.id, employeeId: req.user.id, deletedAt: null }
    });
    if (!checkin) throw new AppError("Check-in not found", 404);
    if (checkin.status === "RESPONDED" || checkin.status === "CLOSED") {
      throw new AppError("Check-in already responded to", 409);
    }

    const { mood, response, needsHelp } = req.validated.body;
    const [checkinResponse] = await prisma.$transaction([
      prisma.checkinResponse.create({
        data: { checkinId: checkin.id, employeeId: req.user.id, mood, response, needsHelp: !!needsHelp }
      }),
      prisma.checkin.update({
        where: { id: checkin.id },
        data: { status: "RESPONDED" }
      })
    ]);

    if (needsHelp) {
      await prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: checkin.leaderId,
          type: "CHECKIN_REMINDER",
          title: "Employee Needs Help",
          body: `${req.user.firstName} ${req.user.lastName} flagged they need help`,
          status: "PENDING"
        }
      });
    }

    res.json({ response: checkinResponse });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCheckins, getCheckin, createCheckin, respondToCheckin };
