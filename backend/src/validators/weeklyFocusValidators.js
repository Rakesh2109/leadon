const { z } = require("zod");

const upsertWeeklyFocus = z.object({
  topic: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  teamId: z.string().uuid().optional(),
  hiddenFromLeader: z.boolean().default(false),
  weekStart: z.string().datetime().optional(),
});

module.exports = { upsertWeeklyFocus };
