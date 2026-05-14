const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const c = require("../controllers/notificationController");

router.use(authenticate);

router.get("/", c.myNotifications);
router.patch("/read-all", c.markAllRead);
router.patch("/:id/read", c.markNotificationRead);

module.exports = router;
