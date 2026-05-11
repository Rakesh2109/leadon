const express = require("express");
const userController = require("../controllers/userController");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.use(authenticate);
router.get("/me", userController.getMe);
router.patch("/me", userController.updateProfile);
router.post("/fcm-token", userController.registerFcmToken);

module.exports = router;
