const express = require("express");
const authController = require("../controllers/authController");
const { authRateLimiter } = require("../middleware/rateLimit");
const validate = require("../middleware/validate");
const { loginSchema, registerSchema } = require("../validators/authValidators");

const router = express.Router();

router.post("/register", authRateLimiter, validate(registerSchema), authController.register);
router.post("/login", authRateLimiter, validate(loginSchema), authController.login);

module.exports = router;
