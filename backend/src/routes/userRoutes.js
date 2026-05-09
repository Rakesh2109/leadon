const express = require("express");
const userController = require("../controllers/userController");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.get("/me", authenticate, userController.getMe);

module.exports = router;
