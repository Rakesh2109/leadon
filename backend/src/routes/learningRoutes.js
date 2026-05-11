const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { createItem, assignItem } = require("../validators/learningValidators");
const c = require("../controllers/learningController");

router.use(authenticate);

router.get("/", c.listItems);
router.post("/", authorize("ADMIN", "LEADER"), validate({ body: createItem }), c.createItem);
router.post("/:id/assign", authorize("ADMIN", "LEADER"), validate({ body: assignItem }), c.assignItem);
router.get("/my-assignments", c.myAssignments);
router.patch("/assignments/:assignmentId/complete", authorize("EMPLOYEE"), c.completeAssignment);

module.exports = router;
