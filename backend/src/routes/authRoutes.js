const express = require("express");
const authController = require("../controllers/authController");
const authenticate = require("../middleware/authenticate");
const { authRateLimiter } = require("../middleware/rateLimit");
const validate = require("../middleware/validate");
const { loginSchema, registerSchema } = require("../validators/authValidators");

const router = express.Router();

router.post("/register",   authRateLimiter, validate(registerSchema), authController.register);
router.post("/login",      authRateLimiter, validate(loginSchema),    authController.login);
router.post("/refresh",    authRateLimiter, authController.refresh);
router.post("/logout",     authenticate,    authController.logout);
router.post("/logout-all", authenticate,    authController.logoutAll);

module.exports = router;
