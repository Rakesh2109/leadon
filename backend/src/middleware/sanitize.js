const xss = require("xss");

function sanitizeObject(obj) {
  if (typeof obj === "string") return xss(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, sanitizeObject(v)])
    );
  }
  return obj;
}

function sanitize(req, _res, next) {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
}

module.exports = sanitize;
