const express = require("express");
const prisma = require("../config/prisma");

const router = express.Router();

router.get("/health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", service: "leadon-backend", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: "error", service: "leadon-backend", detail: "database unreachable", timestamp: new Date().toISOString() });
  }
});

module.exports = router;
