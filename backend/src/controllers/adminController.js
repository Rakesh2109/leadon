const prisma = require("../config/prisma");
const AppError = require("../utils/appError");
const { hashPassword } = require("../utils/auth");

async function createOrganization(req, res, next) {
  try {
    const { name, slug } = req.validated.body;
    const existing = await prisma.organization.findUnique({ where: { slug } });
    if (existing) throw new AppError("Slug already taken", 409);
    const org = await prisma.organization.create({ data: { name, slug } });
    res.status(201).json({ organization: org });
  } catch (err) { next(err); }
}

async function listOrganizations(req, res, next) {
  try {
    const orgs = await prisma.organization.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { users: true, teams: true } } },
      orderBy: { createdAt: "desc" }
    });
    res.json({ organizations: orgs });
  } catch (err) { next(err); }
}

async function createUser(req, res, next) {
  try {
    const { email, password, firstName, lastName, role, organizationId } = req.validated.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError("Email already in use", 409);
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email, passwordHash, firstName, lastName, role,
        organizationId: organizationId || null,
        createdById: req.user.id
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, organizationId: true, createdAt: true }
    });
    res.status(201).json({ user });
  } catch (err) { next(err); }
}

async function deleteUser(req, res, next) {
  try {
    // Org-scoped: admins can only delete users in their own org
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, organizationId: req.user.organizationId, deletedAt: null }
    });
    if (!user) throw new AppError("User not found", 404);
    if (user.id === req.user.id) throw new AppError("Cannot delete yourself", 400);

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } }),
      // Revoke all refresh tokens for the deleted user immediately
      prisma.refreshToken.updateMany({ where: { userId: req.params.id }, data: { revokedAt: new Date() } })
    ]);
    res.json({ message: "User deleted" });
  } catch (err) { next(err); }
}

async function getAuditLogs(req, res, next) {
  try {
    const { cursor, limit: rawLimit } = req.query;
    const limit = Math.min(parseInt(rawLimit) || 50, 200);
    const rows = await prisma.auditLog.findMany({
      where: { organizationId: req.user.organizationId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
    });
    const hasMore = rows.length > limit;
    const logs = hasMore ? rows.slice(0, limit) : rows;
    res.json({ logs, nextCursor: hasMore ? logs[logs.length - 1].id : null, hasMore });
  } catch (err) { next(err); }
}

module.exports = { createOrganization, listOrganizations, createUser, deleteUser, getAuditLogs };
