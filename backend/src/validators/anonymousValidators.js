const { z } = require("zod");

const sendAnonymousMessage = z.object({
  body: z.string().min(1).max(2000),
  teamId: z.string().uuid().optional(),
});

const updateAnonymousMessage = z.object({
  status: z.enum(["READ", "ARCHIVED"]).optional(),
  leaderNote: z.string().max(1000).optional(),
});

module.exports = { sendAnonymousMessage, updateAnonymousMessage };
