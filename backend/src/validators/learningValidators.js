const { z } = require("zod");

const createItem = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  contentUrl: z.string().url().optional(),
  estimatedMins: z.number().int().positive().optional(),
  hkmStageId: z.string().uuid().optional()
});

const assignItem = z.object({
  employeeId: z.string().uuid(),
  dueAt: z.string().datetime().optional()
});

module.exports = { createItem, assignItem };
