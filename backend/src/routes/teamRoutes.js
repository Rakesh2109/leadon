const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { createTeam, updateTeam, addMember } = require("../validators/teamValidators");
const c = require("../controllers/teamController");

router.use(authenticate);

router.get("/", c.listTeams);
router.get("/:id", c.getTeam);
router.post("/", authorize("ADMIN", "LEADER"), validate({ body: createTeam }), c.createTeam);
router.patch("/:id", authorize("ADMIN", "LEADER"), validate({ body: updateTeam }), c.updateTeam);
router.delete("/:id", authorize("ADMIN"), c.deleteTeam);
router.post("/:id/members", authorize("ADMIN", "LEADER"), validate({ body: addMember }), c.addMember);
router.delete("/:id/members/:userId", authorize("ADMIN", "LEADER"), c.removeMember);

module.exports = router;
