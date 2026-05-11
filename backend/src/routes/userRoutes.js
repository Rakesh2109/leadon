const express = require("express");
const userController = require("../controllers/userController");
const authenticate = require("../middleware/authenticate");
const upload = require("../middleware/upload");

const router = express.Router();

router.use(authenticate);
router.get("/me", userController.getMe);
router.patch("/me", userController.updateProfile);
router.post("/me/avatar", upload.single("avatar"), userController.uploadAvatar);
router.post("/fcm-token", userController.registerFcmToken);

module.exports = router;
