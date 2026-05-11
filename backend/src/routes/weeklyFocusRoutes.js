const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { upsertWeeklyFocus } = require("../validators/weeklyFocusValidators");
const c = require("../controllers/weeklyFocusController");

router.use(authenticate);

router.get("/me", c.getMyWeeklyFocus);
router.put("/me", validate({ body: upsertWeeklyFocus }), c.upsertWeeklyFocus);
router.get("/teams/:teamId", authorize("LEADER", "ADMIN"), c.getTeamWeeklyFocuses);

module.exports = router;
