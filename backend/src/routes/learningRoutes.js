const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const validate = require("../middleware/validate");
const { createItem, assignItem } = require("../validators/learningValidators");
const c = require("../controllers/learningController");
const upload = require("../middleware/upload");

router.use(authenticate);

// File upload — returns a URL that can be used as contentUrl
router.post("/upload", authorize("ADMIN", "LEADER"), upload.single("file"), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, originalName: req.file.originalname, size: req.file.size });
  } catch (err) { next(err); }
});

router.get("/my-assignments", c.myAssignments);
router.patch("/assignments/:assignmentId/complete", c.completeAssignment);
router.get("/", c.listItems);
router.post("/", authorize("ADMIN", "LEADER"), validate({ body: createItem }), c.createItem);
router.post("/:id/assign", authorize("ADMIN", "LEADER"), validate({ body: assignItem }), c.assignItem);

module.exports = router;
