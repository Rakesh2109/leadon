const { z } = require("zod");

const sendMessage = z.object({
  recipientId: z.string().uuid(),
  body: z.string().min(1).max(5000),
  type: z.enum(["FEEDBACK", "RECOGNITION", "SUPPORT", "GENERAL"]).optional()
});

module.exports = { sendMessage };
