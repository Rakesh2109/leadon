const router = require("express").Router();
const { z } = require("zod");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { getMyOrganization, updateOrganization, getOrgUsers } = require("../controllers/organizationController");

const updateOrgSchema = z.object({ name: z.string().min(1).max(200) });

router.use(authenticate);

router.get("/me", getMyOrganization);
router.get("/me/users", authorize("ADMIN", "LEADER"), getOrgUsers);
router.patch("/me", authorize("ADMIN"), validate({ body: updateOrgSchema }), updateOrganization);

module.exports = router;
