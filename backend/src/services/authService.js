const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const env = require("../config/env");
const AppError = require("../utils/appError");
const { signToken } = require("../utils/auth");
const { serializeUser } = require("../utils/userSerializer");

async function registerUser(data) {
  if (
    data.role === "ADMIN" &&
    (!env.ADMIN_REGISTRATION_CODE || data.adminRegistrationCode !== env.ADMIN_REGISTRATION_CODE)
  ) {
    throw new AppError("Invalid admin registration code", 403);
  }

  if (data.role === "LEADER") {
    throw new AppError("Leaders must be invited or created by an admin", 403);
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (existingUser) {
    throw new AppError("A user with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      organizationId: data.organizationId
    }
  });

  return {
    user: serializeUser(user),
    token: signToken(user)
  };
}

async function loginUser({ email, password }) {
  const user = await prisma.user.findFirst({
    where: {
      email,
      deletedAt: null
    }
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  return {
    user: serializeUser(updatedUser),
    token: signToken(updatedUser)
  };
}

module.exports = {
  registerUser,
  loginUser
};
