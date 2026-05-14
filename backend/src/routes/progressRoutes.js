const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { progressBody } = require("../validators/adminValidators");
const c = require("../controllers/progressController");

router.use(authenticate);

router.get("/hkm-stages", c.getHkmStages);
router.get("/reports", authorize("ADMIN", "LEADER"), c.getReports);
router.get("/dashboard", c.getDashboard);
router.get("/my-progress", c.getMyProgress);
router.get("/employees/:employeeId", authorize("ADMIN", "LEADER"), c.getEmployeeProgress);
router.post("/", authorize("ADMIN", "LEADER"), validate({ body: progressBody }), c.setEmployeeProgress);

module.exports = router;
