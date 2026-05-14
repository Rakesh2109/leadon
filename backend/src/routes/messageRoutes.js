const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const { sendMessage } = require("../validators/messageValidators");
const c = require("../controllers/messageController");

router.use(authenticate);

router.get("/", c.listMessages);
router.post("/", validate({ body: sendMessage }), c.sendMessage);
router.patch("/:id/read", c.markRead);

module.exports = router;
