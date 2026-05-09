const express = require("express");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "leadon-backend",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
