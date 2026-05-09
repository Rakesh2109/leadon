function serializeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    organizationId: user.organizationId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

module.exports = {
  serializeUser
};
