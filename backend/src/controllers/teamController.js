const prisma = require("../config/prisma");
const AppError = require("../utils/appError");

async function listTeams(req, res, next) {
  try {
    const { cursor, limit: rawLimit } = req.query;
    const limit = Math.min(parseInt(rawLimit) || 20, 100);
    const where = { organizationId: req.user.organizationId, deletedAt: null };
    if (req.user.role === "LEADER") where.leaderId = req.user.id;

    const rows = await prisma.team.findMany({
      where,
      include: {
        leader: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count:  { select: { members: { where: { deletedAt: null } } } }
      },
      orderBy: { name: "asc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });

    const hasMore = rows.length > limit;
    const teams = hasMore ? rows.slice(0, limit) : rows;
    res.json({ teams, nextCursor: hasMore ? teams[teams.length - 1].id : null, hasMore });
  } catch (err) { next(err); }
}

async function getTeam(req, res, next) {
  try {
    const team = await prisma.team.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId, deletedAt: null },
      include: {
        leader:  { select: { id: true, firstName: true, lastName: true, email: true } },
        members: {
          where: { deletedAt: null },
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } }
        }
      }
    });
    if (!team) throw new AppError("Team not found", 404);
    res.json({ team });
  } catch (err) { next(err); }
}

async function createTeam(req, res, next) {
  try {
    const { name, leaderId } = req.validated.body;
    const team = await prisma.team.create({
      data: {
        name,
        organizationId: req.user.organizationId,
        leaderId: leaderId || null,
        createdById: req.user.id
      }
    });
    res.status(201).json({ team });
  } catch (err) { next(err); }
}

async function updateTeam(req, res, next) {
  try {
    const team = await prisma.team.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId, deletedAt: null }
    });
    if (!team) throw new AppError("Team not found", 404);

    // Whitelist fields explicitly — prevent mass-assignment
    const { name, leaderId } = req.validated.body;
    const updated = await prisma.team.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(leaderId !== undefined && { leaderId: leaderId || null })
      }
    });
    res.json({ team: updated });
  } catch (err) { next(err); }
}

async function deleteTeam(req, res, next) {
  try {
    const team = await prisma.team.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId, deletedAt: null }
    });
    if (!team) throw new AppError("Team not found", 404);
    await prisma.team.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ message: "Team deleted" });
  } catch (err) { next(err); }
}

async function addMember(req, res, next) {
  try {
    const { userId, role } = req.validated.body;
    const [team, user] = await Promise.all([
      prisma.team.findFirst({ where: { id: req.params.id, organizationId: req.user.organizationId, deletedAt: null } }),
      prisma.user.findFirst({ where: { id: userId, organizationId: req.user.organizationId, deletedAt: null } })
    ]);
    if (!team) throw new AppError("Team not found", 404);
    if (!user) throw new AppError("User not found in organization", 404);

    const member = await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: req.params.id, userId } },
      create: { teamId: req.params.id, userId, role: role || "MEMBER" },
      update: { deletedAt: null, role: role || "MEMBER" }
    });
    res.status(201).json({ member });
  } catch (err) { next(err); }
}

async function removeMember(req, res, next) {
  try {
    const member = await prisma.teamMember.findFirst({
      where: { teamId: req.params.id, userId: req.params.userId, deletedAt: null }
    });
    if (!member) throw new AppError("Member not found", 404);
    await prisma.teamMember.update({ where: { id: member.id }, data: { deletedAt: new Date() } });
    res.json({ message: "Member removed" });
  } catch (err) { next(err); }
}

module.exports = { listTeams, getTeam, createTeam, updateTeam, deleteTeam, addMember, removeMember };
