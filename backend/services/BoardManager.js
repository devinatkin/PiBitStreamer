// backend/services/BoardManager.js
const path = require("path");
const fs = require("fs");

class BoardManager {
  constructor(programmer) {
    this.programmer = programmer;

    // initial board list
    this.boards = [
      "Basys3-A",
      "Basys3-B",
      "Basys3-C",
      "Basys3-D",
    ].map((id) => ({
      id,
      status: "READY", // READY | BUSY | FLASHING | ERROR
      userid: null,
      ip: null,
      leaseSince: null,
      leaseUntil: null,
      secondsLeft: 0,
      lastError: null,
      currentJobId: null,
    }));

    // jobs: jobId -> { boardId, filePath, originalName, createdAt }
    this.jobs = {};

    // ensure upload dir exists
    this.uploadDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    // start lease expiry timer
    setInterval(() => this._checkLeases(), 10_000);
  }

  _findBoard(id) {
    const board = this.boards.find((b) => b.id === id);
    if (!board) {
      throw new Error(`Board ${id} not found`);
    }
    return board;
  }

  _checkLeases() {
    const now = Date.now();
    this.boards.forEach((board) => {
      if (board.leaseUntil) {
        const diffMs = board.leaseUntil - now;
        board.secondsLeft = Math.max(0, Math.floor(diffMs / 1000));

        if (diffMs <= 0) {
          // auto-release
          console.log(`[LEASE] Auto-releasing board ${board.id}`);
          this.releaseBoard(board.id);
        }
      } else {
        board.secondsLeft = 0;
      }
    });
  }

  getBoards() {
    return this.boards;
  }

  getBoard(id) {
    return this._findBoard(id);
  }

  claimBoard(id, { userid, ip, leaseMinutes = 30 }) {
    const board = this._findBoard(id);

    if (board.status !== "READY") {
      throw new Error(`Board ${id} is not available`);
    }

    const now = Date.now();
    const leaseMs = leaseMinutes * 60 * 1000;

    board.status = "BUSY";
    board.userid = userid;
    board.ip = ip;
    board.leaseSince = now;
    board.leaseUntil = now + leaseMs;
    board.lastError = null;

    this._checkLeases(); // update secondsLeft immediately

    return board;
  }

  releaseBoard(id) {
    const board = this._findBoard(id);

    board.status = "READY";
    board.userid = null;
    board.ip = null;
    board.leaseSince = null;
    board.leaseUntil = null;
    board.secondsLeft = 0;
    board.currentJobId = null;
    board.lastError = null;

    return board;
  }

  registerUpload(boardId, file) {
    if (!file) {
      throw new Error("No file uploaded");
    }

    // multer already placed file somewhere; just record it
    const jobId = `job_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    this.jobs[jobId] = {
      jobId,
      boardId,
      filePath: file.path,
      originalName: file.originalname,
      createdAt: new Date().toISOString(),
    };

    const board = this._findBoard(boardId);
    board.currentJobId = jobId;

    return { jobId, board };
  }

  async flashBoard(boardId, jobId) {
    const board = this._findBoard(boardId);

    const job = this.jobs[jobId];
    if (!job || job.boardId !== boardId) {
      throw new Error("Job not found for this board");
    }

    board.status = "FLASHING";
    board.lastError = null;

    try {
      await this.programmer.flashBitstream(boardId, job.filePath);
      board.status = "READY";
    } catch (err) {
      console.error(`[FLASH] Error flashing ${boardId}:`, err);
      board.status = "ERROR";
      board.lastError = err.message || "Flash failed";
      throw err;
    }

    return board;
  }

  async rebootBoard(boardId) {
    const board = this._findBoard(boardId);

    await this.programmer.rebootBoard(boardId);

    // after reboot, treat as released
    this.releaseBoard(boardId);
    return board;
  }
}

module.exports = BoardManager;
