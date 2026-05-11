const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const env = require("../config/env");

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      organizationId: user.organizationId
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}

async function hashPassword(password) {
  return bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
}

module.exports = {
  signToken,
  verifyToken,
  hashPassword
};
