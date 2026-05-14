const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const { sendAnonymousMessage, updateAnonymousMessage } = require("../validators/anonymousValidators");
const c = require("../controllers/anonymousController");

router.use(authenticate);

router.post("/", validate({ body: sendAnonymousMessage }), c.sendAnonymousMessage);
router.get("/", c.listAnonymousMessages);
router.patch("/:id", validate({ body: updateAnonymousMessage }), c.updateAnonymousMessage);

module.exports = router;
