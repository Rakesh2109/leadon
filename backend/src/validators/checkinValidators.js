const { z } = require("zod");

const createCheckin = z.object({
  employeeId: z.string().uuid(),
  title: z.string().min(1).max(200),
  prompt: z.string().min(1).max(2000),
  hkmStageId: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional()
});

const respondCheckin = z.object({
  mood: z.enum(["GREAT", "GOOD", "OKAY", "LOW", "STUCK"]).optional(),
  response: z.string().min(1).max(5000),
  needsHelp: z.boolean().optional()
});

module.exports = { createCheckin, respondCheckin };
