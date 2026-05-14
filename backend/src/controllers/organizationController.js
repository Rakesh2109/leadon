const prisma = require("../config/prisma");
const AppError = require("../utils/appError");

async function getMyOrganization(req, res, next) {
  try {
    if (!req.user.organizationId) {
      throw new AppError("You are not part of any organization", 404);
    }
    const org = await prisma.organization.findFirst({
      where: { id: req.user.organizationId, deletedAt: null },
      include: { _count: { select: { users: true, teams: true } } }
    });
    if (!org) throw new AppError("Organization not found", 404);
    res.json({ organization: org });
  } catch (err) {
    next(err);
  }
}

async function updateOrganization(req, res, next) {
  try {
    const { name } = req.validated.body;
    const org = await prisma.organization.update({
      where: { id: req.user.organizationId },
      data: { name }
    });
    res.json({ organization: org });
  } catch (err) {
    next(err);
  }
}

async function getOrgUsers(req, res, next) {
  try {
    const { role, search } = req.query;
    const where = {
      organizationId: req.user.organizationId,
      deletedAt: null
    };
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } }
      ];
    }
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, createdAt: true, lastLoginAt: true
      },
      orderBy: { firstName: "asc" }
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyOrganization, updateOrganization, getOrgUsers };
