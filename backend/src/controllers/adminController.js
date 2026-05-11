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
  } catch (err) {
    next(err);
  }
}

async function listOrganizations(req, res, next) {
  try {
    const orgs = await prisma.organization.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { users: true, teams: true } } },
      orderBy: { createdAt: "desc" }
    });
    res.json({ organizations: orgs });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { email, password, firstName, lastName, role, organizationId } = req.validated.body;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new AppError("Email already in use", 409);
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, firstName, lastName, role, organizationId: organizationId || null, createdById: req.user.id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, organizationId: true, createdAt: true }
    });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!user) throw new AppError("User not found", 404);
    if (user.id === req.user.id) throw new AppError("Cannot delete yourself", 400);
    await prisma.user.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    res.json({ message: "User deleted" });
  } catch (err) {
    next(err);
  }
}

async function seedHkmStages(req, res, next) {
  try {
    const orgId = req.body.organizationId || null;
    const defaultStages = [
      { name: "Enthusiastic Beginner", description: "High commitment, low competence. New to task, excited.", position: 1 },
      { name: "Disillusioned Learner", description: "Low commitment, low-to-some competence. Reality sets in.", position: 2 },
      { name: "Capable but Cautious", description: "Variable commitment, moderate-to-high competence.", position: 3 },
      { name: "Self-Reliant Achiever", description: "High commitment and high competence. Peak performance.", position: 4 },
      { name: "Expert Mentor", description: "Peak competence, coaching others.", position: 5 },
      { name: "Transformational Leader", description: "Strategic vision, org-wide influence.", position: 6 }
    ];
    const stages = await Promise.all(
      defaultStages.map((s) =>
        prisma.hKMStage.upsert({
          where: { organizationId_position: { organizationId: orgId, position: s.position } },
          create: { ...s, organizationId: orgId },
          update: {}
        })
      )
    );
    res.json({ stages });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrganization, listOrganizations, createUser, deleteUser, seedHkmStages };
