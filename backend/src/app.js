const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const hpp = require("hpp");
const slowDown = require("express-slow-down");
const env = require("./config/env");
const sanitize = require("./middleware/sanitize");
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

// Logging
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// XSS sanitization on all requests
app.use(sanitize);

// Global speed limiter (slow repeated requests, doesn't block)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: (hits) => hits * 100
});
app.use("/api", speedLimiter);

// Routes
app.use("/api", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/checkins", checkinRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
