// backend/controllers/boardsController.js
module.exports = function createBoardsController(boardManager) {
  // GET /api/boards
  const getBoards = async (req, res) => {
    try {
      const boards = await boardManager.getBoards();
      res.json({ success: true, boards });
    } catch (err) {
      console.error("GET /boards error:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch boards" });
    }
  };

  // POST /api/boards/:id/claim
  const claimBoard = async (req, res) => {
    const { id } = req.params;
    const { userid, leaseMinutes } = req.body;
    const ip = req.ip;

    if (!userid) {
      return res
        .status(400)
        .json({ success: false, message: "Missing user field" });
    }

    try {
      const board = await boardManager.claimBoard(id, {
        userid,
        ip,
        leaseMinutes: leaseMinutes || 30,
      });
      res.json({ board });
    } catch (err) {
      console.error("Claim error:", err);
      res.status(400).json({ success: false, message: err.message });
    }
  };

  // POST /api/boards/:id/upload
  const uploadBitstream = async (req, res) => {
    const { id } = req.params;

    try {
      const { jobId, board } = await boardManager.registerUpload(
        id,
        req.file
      );
      res.json({ jobId, board });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(400).json({ success: false, message: err.message });
    }
  };

  // POST /api/boards/:id/flash
  const flashBoard = async (req, res) => {
    const { id } = req.params;
    const { jobId } = req.body;

    if (!jobId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing jobId" });
    }

    try {
      const board = await boardManager.flashBoard(id, jobId);
      res.json({ board });
    } catch (err) {
      console.error("Flash error:", err);
      res.status(500).json({
        success: false,
        message: err.message || "Flash failed",
      });
    }
  };

  // POST /api/boards/:id/release  (student/user-initiated release)
  const releaseBoard = async (req, res) => {
    const { id } = req.params;

    try {
      const board = await boardManager.releaseBoard(id);
      res.json({ board });
    } catch (err) {
      console.error("Release error:", err);
      res.status(400).json({ success: false, message: err.message });
    }
  };

  // GET /api/boards/admin
  const getBoardsAdmin = async (req, res) => {
    try {
      const boards = await boardManager.getBoards();
      res.json({ boards });
    } catch (err) {
      console.error("Admin boards error:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch boards" });
    }
  };

  // POST /api/boards/:id/force-release  (admin override, same underlying operation)
  const forceReleaseBoard = async (req, res) => {
    const { id } = req.params;

    try {
      const board = await boardManager.releaseBoard(id);
      res.json({ board });
    } catch (err) {
      console.error("Force release error:", err);
      res.status(400).json({ success: false, message: err.message });
    }
  };

  // POST /api/boards/:id/reboot
  const rebootBoard = async (req, res) => {
    const { id } = req.params;

    try {
      const board = await boardManager.rebootBoard(id);
      res.json({ success: true, board });
    } catch (err) {
      console.error("Reboot error:", err);
      res.status(500).json({ success: false, message: err.message });
    }
  };

  return {
    getBoards,
    claimBoard,
    uploadBitstream,
    flashBoard,
    releaseBoard,
    getBoardsAdmin,
    forceReleaseBoard,
    rebootBoard,
  };
};