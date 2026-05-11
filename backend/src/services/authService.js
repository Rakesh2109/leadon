const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const env = require("../config/env");
const AppError = require("../utils/appError");
const { signAccessToken, generateRefreshToken, hashPassword } = require("../utils/auth");
const { serializeUser } = require("../utils/userSerializer");

const REFRESH_TOKEN_TTL_DAYS = 7;

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
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError("A user with this email already exists", 409);

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      organizationId: data.organizationId || null,
    }
  });
  return { user: serializeUser(user) };
}

async function loginUser({ email, password }, meta = {}) {
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (!user) throw new AppError("Invalid email or password", 401);

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) throw new AppError("Invalid email or password", 401);

  const [updatedUser, refreshTokenRecord] = await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: generateRefreshToken(),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86_400_000),
        userAgent: meta.userAgent || null,
        ipAddress: meta.ipAddress || null,
      }
    })
  ]);

  return {
    user: serializeUser(updatedUser),
    accessToken: signAccessToken(updatedUser),
    refreshToken: refreshTokenRecord.token,
  };
}

async function refreshAccessToken(rawToken) {
  if (!rawToken) throw new AppError("Refresh token required", 401);
  const stored = await prisma.refreshToken.findFirst({
    where: { token: rawToken, revokedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true }
  });
  if (!stored || stored.user.deletedAt) throw new AppError("Invalid or expired refresh token", 401);

  const accessToken = signAccessToken(stored.user);
  return { accessToken, user: serializeUser(stored.user) };
}

async function logoutUser(userId, rawToken) {
  if (rawToken) {
    await prisma.refreshToken.updateMany({
      where: { userId, token: rawToken },
      data: { revokedAt: new Date() }
    });
  } else {
    // revoke ALL sessions
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }
}

module.exports = { registerUser, loginUser, refreshAccessToken, logoutUser };
