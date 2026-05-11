const prisma = require("../config/prisma");
const logger = require("../config/logger");

const AUDITED = {
  POST:   ["teams", "checkins", "messages", "learning", "progress", "admin"],
  PATCH:  ["teams", "users", "organizations"],
  DELETE: ["teams", "users", "admin"],
};

function shouldAudit(req) {
  const methods = AUDITED[req.method];
  if (!methods) return false;
  return methods.some((seg) => req.path.includes(seg));
}

function extractResource(path) {
  const parts = path.replace(/^\/api\/v1\//, "").split("/").filter(Boolean);
  return parts[0] || "unknown";
}

function extractResourceId(path) {
  const parts = path.replace(/^\/api\/v1\//, "").split("/").filter(Boolean);
  return parts[1] || null;
}

function auditLog(req, res, next) {
  if (!shouldAudit(req)) return next();

  const originalJson = res.json.bind(res);
  res.json = function (body) {
    if (res.statusCode < 400 && req.user) {
      prisma.auditLog.create({
        data: {
          organizationId: req.user.organizationId || null,
          userId: req.user.id,
          action: req.method,
          resource: extractResource(req.path),
          resourceId: extractResourceId(req.path),
          meta: { body: req.body, status: res.statusCode },
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"] || null,
        }
      }).catch((err) => logger.error({ err }, "Audit log write failed"));
    }
    return originalJson(body);
  };

  next();
}

module.exports = auditLog;
