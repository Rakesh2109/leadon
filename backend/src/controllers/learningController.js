const prisma = require("../config/prisma");
const AppError = require("../utils/appError");

async function listItems(req, res, next) {
  try {
    const { hkmStageId, cursor, limit: rawLimit } = req.query;
    const limit = Math.min(parseInt(rawLimit) || 20, 100);
    const where = {
      OR: [{ organizationId: req.user.organizationId }, { organizationId: null }],
      isActive: true,
      deletedAt: null
    };
    if (hkmStageId) where.hkmStageId = hkmStageId;

    const rows = await prisma.learningItem.findMany({
      where,
      include: { hkmStage: { select: { id: true, name: true, position: true } } },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    res.json({ items, nextCursor: hasMore ? items[items.length - 1].id : null, hasMore });
  } catch (err) { next(err); }
}

async function createItem(req, res, next) {
  try {
    const { title, description, contentUrl, estimatedMins, hkmStageId } = req.validated.body;
    const item = await prisma.learningItem.create({
      data: {
        title,
        description: description || null,
        contentUrl: contentUrl || null,
        estimatedMins: estimatedMins || null,
        hkmStageId: hkmStageId || null,
        organizationId: req.user.organizationId,
        createdById: req.user.id
      }
    });
    res.status(201).json({ item });
  } catch (err) { next(err); }
}

async function assignItem(req, res, next) {
  try {
    const { employeeId, dueAt } = req.validated.body;

    // Multi-tenancy: item must belong to this org OR be global
    const [item, employee] = await Promise.all([
      prisma.learningItem.findFirst({
        where: {
          id: req.params.id, isActive: true, deletedAt: null,
          OR: [{ organizationId: req.user.organizationId }, { organizationId: null }]
        }
      }),
      prisma.user.findFirst({
        where: { id: employeeId, organizationId: req.user.organizationId, deletedAt: null }
      })
    ]);
    if (!item) throw new AppError("Learning item not found", 404);
    if (!employee) throw new AppError("Employee not found", 404);

    const [assignment] = await prisma.$transaction([
      prisma.learningAssignment.create({
        data: {
          learningItemId: req.params.id,
          employeeId,
          assignedById: req.user.id,
          dueAt: dueAt ? new Date(dueAt) : null
        }
      }),
      prisma.notification.create({
        data: {
          organizationId: req.user.organizationId,
          userId: employeeId,
          type: "LEARNING_ASSIGNED",
          title: "New Learning Assigned",
          body: `"${item.title}" has been assigned to you`,
          status: "PENDING"
        }
      })
    ]);

    res.status(201).json({ assignment });
  } catch (err) { next(err); }
}

async function myAssignments(req, res, next) {
  try {
    const { status, cursor, limit: rawLimit } = req.query;
    const limit = Math.min(parseInt(rawLimit) || 20, 100);
    const where = { employeeId: req.user.id, deletedAt: null };
    if (status) where.status = status;

    const rows = await prisma.learningAssignment.findMany({
      where,
      include: { learningItem: { include: { hkmStage: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });

    const hasMore = rows.length > limit;
    const assignments = hasMore ? rows.slice(0, limit) : rows;
    res.json({ assignments, nextCursor: hasMore ? assignments[assignments.length - 1].id : null, hasMore });
  } catch (err) { next(err); }
}

async function completeAssignment(req, res, next) {
  try {
    const assignment = await prisma.learningAssignment.findFirst({
      where: { id: req.params.assignmentId, employeeId: req.user.id, deletedAt: null }
    });
    if (!assignment) throw new AppError("Assignment not found", 404);
    if (assignment.status === "COMPLETED") throw new AppError("Already completed", 409);

    const { reflection } = req.body;
    const updated = await prisma.learningAssignment.update({
      where: { id: req.params.assignmentId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        reflection: reflection ? String(reflection).slice(0, 5000) : null
      }
    });
    res.json({ assignment: updated });
  } catch (err) { next(err); }
}

module.exports = { listItems, createItem, assignItem, myAssignments, completeAssignment };
