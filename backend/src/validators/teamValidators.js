const { z } = require("zod");

const createTeam = z.object({
  name: z.string().min(1).max(100),
  leaderId: z.string().uuid().optional()
});

const updateTeam = z.object({
  name: z.string().min(1).max(100).optional(),
  leaderId: z.string().uuid().nullable().optional()
});

const addMember = z.object({
  userId: z.string().uuid(),
  role: z.enum(["LEADER", "MEMBER"]).optional()
});

module.exports = { createTeam, updateTeam, addMember };
