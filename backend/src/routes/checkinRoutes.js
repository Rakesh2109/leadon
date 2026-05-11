const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { createCheckin, respondCheckin } = require("../validators/checkinValidators");
const c = require("../controllers/checkinController");

router.use(authenticate);

router.get("/templates", c.listTemplates);
router.post("/templates", authorize("ADMIN", "LEADER"), c.createTemplate);
router.delete("/templates/:id", authorize("ADMIN", "LEADER"), c.deleteTemplate);

router.get("/", c.listCheckins);
router.get("/:id", c.getCheckin);
router.post("/", authorize("ADMIN", "LEADER"), validate({ body: createCheckin }), c.createCheckin);
router.post("/:id/respond", authorize("EMPLOYEE"), validate({ body: respondCheckin }), c.respondToCheckin);

module.exports = router;
