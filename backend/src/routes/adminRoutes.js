const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { createOrg, createUser } = require("../validators/adminValidators");
const c = require("../controllers/adminController");

router.use(authenticate, authorize("ADMIN"));

router.get("/organizations", c.listOrganizations);
router.post("/organizations", validate({ body: createOrg }), c.createOrganization);
router.post("/users", validate({ body: createUser }), c.createUser);
router.delete("/users/:id", c.deleteUser);
router.get("/audit-logs", c.getAuditLogs);

module.exports = router;
