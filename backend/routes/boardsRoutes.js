// backend/routes/boardsRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const auth = require("../middleware/auth");
const createBoardsController = require("../controllers/boardsController");

// 🔁 CHANGE THIS:
/// const FakeProgrammer = require("../hardware/FakeProgrammer");
// 👉 TO:
const CmodA7Programmer = require("../hardware/CmodA7Programmer");

const BoardManager = require("../services/BoardManager");

// build everything here

// 🔁 CHANGE THIS:
// const programmer = new FakeProgrammer();
// 👉 TO:
const programmer = new CmodA7Programmer({
  // use "cmoda7_15t" if you have the 15T variant
  boardName: "cmoda7_15t",
  // openFPGALoaderBin: "/usr/local/bin/openFPGALoader", // only if not in PATH
});

const boardManager = new BoardManager(programmer);
const controller = createBoardsController(boardManager);

const upload = multer({
  dest: path.join(__dirname, "..", "uploads"),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".bit", ".svf", ".sv"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) {
      return cb(new Error("Invalid file type"));
    }
    cb(null, true);
  },
});

const router = express.Router();

router.get("/", controller.getBoards);
router.post("/:id/claim", controller.claimBoard);
router.post("/:id/upload", upload.single("file"), controller.uploadBitstream);
router.post("/:id/flash", controller.flashBoard);
router.post("/:id/release", controller.releaseBoard);

router.get("/admin/", auth, controller.getBoardsAdmin);
router.post("/:id/force-release", auth, controller.forceReleaseBoard);
router.post("/:id/reboot", auth, controller.rebootBoard);

module.exports = router;
