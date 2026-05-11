const prisma = require("../config/prisma");
const AppError = require("../utils/appError");

async function listItems(req, res, next) {
  try {
    const { hkmStageId } = req.query;
    const where = {
      OR: [{ organizationId: req.user.organizationId }, { organizationId: null }],
      isActive: true,
      deletedAt: null
    };
    if (hkmStageId) where.hkmStageId = hkmStageId;
    const items = await prisma.learningItem.findMany({
      where,
      include: { hkmStage: { select: { id: true, name: true, position: true } } },
      orderBy: { createdAt: "desc" }
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

async function createItem(req, res, next) {
  try {
    const item = await prisma.learningItem.create({
      data: { ...req.validated.body, organizationId: req.user.organizationId, createdById: req.user.id }
    });
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
}

async function assignItem(req, res, next) {
  try {
    const { employeeId, dueAt } = req.validated.body;
    const item = await prisma.learningItem.findFirst({
      where: { id: req.params.id, isActive: true, deletedAt: null }
    });
    if (!item) throw new AppError("Learning item not found", 404);
    const employee = await prisma.user.findFirst({
      where: { id: employeeId, organizationId: req.user.organizationId, deletedAt: null }
    });
    if (!employee) throw new AppError("Employee not found", 404);

    const assignment = await prisma.learningAssignment.create({
      data: {
        learningItemId: req.params.id,
        employeeId,
        assignedById: req.user.id,
        dueAt: dueAt ? new Date(dueAt) : null
      }
    });

    await prisma.notification.create({
      data: {
        organizationId: req.user.organizationId,
        userId: employeeId,
        type: "LEARNING_ASSIGNED",
        title: "New Learning Assigned",
        body: `"${item.title}" has been assigned to you`,
        status: "PENDING"
      }
    });

    res.status(201).json({ assignment });
  } catch (err) {
    next(err);
  }
}

async function myAssignments(req, res, next) {
  try {
    const { status } = req.query;
    const where = { employeeId: req.user.id, deletedAt: null };
    if (status) where.status = status;
    const assignments = await prisma.learningAssignment.findMany({
      where,
      include: { learningItem: { include: { hkmStage: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: "desc" }
    });
    res.json({ assignments });
  } catch (err) {
    next(err);
  }
}

async function completeAssignment(req, res, next) {
  try {
    const assignment = await prisma.learningAssignment.findFirst({
      where: { id: req.params.assignmentId, employeeId: req.user.id, deletedAt: null }
    });
    if (!assignment) throw new AppError("Assignment not found", 404);
    const { reflection } = req.body;
    const updated = await prisma.learningAssignment.update({
      where: { id: req.params.assignmentId },
      data: { status: "COMPLETED", completedAt: new Date(), reflection: reflection || null }
    });
    res.json({ assignment: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { listItems, createItem, assignItem, myAssignments, completeAssignment };
