const { z } = require("zod");

const BOOST_CATEGORIES = ["PRESENCE", "COLLABORATION", "INITIATIVE", "GROWTH"];

const sendBoost = z.object({
  recipientId: z.string().uuid(),
  message: z.string().min(1).max(1000),
  category: z.enum(BOOST_CATEGORIES).default("GROWTH"),
  categoryLabel: z.string().max(200).optional(),
});

const listBoosts = z.object({
  recipientId: z.string().uuid().optional(),
  category: z.enum(BOOST_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

module.exports = { sendBoost, listBoosts };
