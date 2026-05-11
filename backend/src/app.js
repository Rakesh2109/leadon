const path = require("path");
const express = require("express");
const compression = require("compression");
const cors = require("cors");
const helmet = require("helmet");
const hpp = require("hpp");
const cookieParser = require("cookie-parser");
const slowDown = require("express-slow-down");
const pinoHttp = require("pino-http");
const env = require("./config/env");
const logger = require("./config/logger");
const sanitize = require("./middleware/sanitize");
const requestId = require("./middleware/requestId");
const auditLog = require("./middleware/auditLog");
const authRoutes = require("./routes/authRoutes");
const healthRoutes = require("./routes/healthRoutes");
const userRoutes = require("./routes/userRoutes");
const organizationRoutes = require("./routes/organizationRoutes");
const teamRoutes = require("./routes/teamRoutes");
const checkinRoutes = require("./routes/checkinRoutes");
const messageRoutes = require("./routes/messageRoutes");
const learningRoutes = require("./routes/learningRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const progressRoutes = require("./routes/progressRoutes");
const adminRoutes = require("./routes/adminRoutes");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();
const corsOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

// Gzip compression for all responses
app.use(compression());

// Request ID (attach before logger so it's included in log lines)
app.use(requestId);

// Structured request logging
app.use(pinoHttp({
  logger,
  genReqId: (req) => req.id,
  customLogLevel: (req, res) => res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info",
  serializers: {
    req: (req) => ({ method: req.method, url: req.url, id: req.id }),
    res: (res) => ({ statusCode: res.statusCode })
  }
}));

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({ origin: corsOrigins, credentials: true }));

// Prevent HTTP parameter pollution
app.use(hpp());

// Body parsing (limit request size)
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Parse cookies (needed for httpOnly refresh token)
app.use(cookieParser());

// XSS sanitization on all requests
app.use(sanitize);

// Global speed limiter (slow repeated requests, doesn't block)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: (hits) => hits * 100
});
app.use("/api/v1", speedLimiter);

// Audit log (intercepts res.json after auth populates req.user)
app.use(auditLog);

// Routes — all under /api/v1
app.use("/api/v1", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/organizations", organizationRoutes);
app.use("/api/v1/teams", teamRoutes);
app.use("/api/v1/checkins", checkinRoutes);
app.use("/api/v1/messages", messageRoutes);
app.use("/api/v1/learning", learningRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/progress", progressRoutes);
app.use("/api/v1/admin", adminRoutes);

// Serve React frontend in production
if (env.NODE_ENV === "production") {
  const frontendDist = path.resolve(__dirname, "../public");
  app.use(express.static(frontendDist, {
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        // HTML: always revalidate so users get fresh deploys
        res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      } else if (/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico)$/.test(filePath)) {
        // Hashed assets: cache forever (filename changes on each deploy)
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    }
  }));
  app.get("*", (req, res) => {
    const indexFile = path.join(frontendDist, "index.html");
    res.sendFile(indexFile, (err) => {
      if (err) res.status(503).json({ error: "Frontend not built. Run: npm run build" });
    });
  });
} else {
  app.use(notFound);
}

app.use(errorHandler);

module.exports = app;
