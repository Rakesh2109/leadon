const jwt = require("jsonwebtoken");
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

module.exports = {
  signToken,
  verifyToken
};
