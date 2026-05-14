const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { sendBoost, listBoosts } = require("../validators/boostValidators");
const c = require("../controllers/boostController");

router.use(authenticate);

router.get("/", validate({ query: listBoosts }), c.listBoosts);
router.post("/", authorize("LEADER", "ADMIN"), validate({ body: sendBoost }), c.sendBoost);
router.patch("/:id/read", c.markBoostRead);
router.delete("/:id", authorize("LEADER", "ADMIN"), c.deleteBoost);

module.exports = router;
