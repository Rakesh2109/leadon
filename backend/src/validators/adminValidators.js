const { z } = require("zod");

const createOrg = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, hyphens only")
});

const createUser = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["ADMIN", "LEADER", "EMPLOYEE"]),
  organizationId: z.string().uuid().optional()
});

const progressBody = z.object({
  employeeId: z.string().uuid(),
  hkmStageId: z.string().uuid(),
  note: z.string().optional(),
  nextStep: z.string().optional()
});

module.exports = { createOrg, createUser, progressBody };
