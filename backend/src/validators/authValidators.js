const { z } = require("zod");

const roleSchema = z.enum(["ADMIN", "LEADER", "EMPLOYEE"]);

const registerSchema = z.object({
  body: z.object({
    email: z.string().email().transform((value) => value.toLowerCase()),
    password: z.string().min(8).max(128),
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    role: roleSchema.default("EMPLOYEE"),
    organizationId: z.string().uuid().optional(),
    adminRegistrationCode: z.string().optional()
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email().transform((value) => value.toLowerCase()),
    password: z.string().min(1).max(128)
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

module.exports = {
  registerSchema,
  loginSchema
};
