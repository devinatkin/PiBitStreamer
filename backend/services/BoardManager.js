// backend/services/BoardManager.js
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const db = require("../config/adminDb");

// --- small promise helpers for sqlite3 ---
const dbAll = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this); // statement context
    });
  });

// map DB row -> board object used by API / frontend
function rowToBoard(row) {
  if (!row) return null;
  const now = Date.now();
  const leaseUntil = row.lease_until || null;
  const secondsLeft =
    leaseUntil && leaseUntil > now
      ? Math.floor((leaseUntil - now) / 1000)
      : 0;

  return {
    id: row.id,
    status: row.status,
    userid: row.userid,
    ip: row.ip,
    leaseSince: row.lease_since || null,
    leaseUntil: leaseUntil,
    secondsLeft,
    lastError: row.last_error || null,
    currentJobId: row.current_job_id || null,
    hw: {
      bus: row.bus || null,
      dev: row.dev || null,
      vidpid: row.vidpid || null,
      probeType: row.probe_type || null,
      manufacturer: row.manufacturer || null,
      serial: row.serial || null,
      product: row.product || null,
    },
  };
}

// Helper function to sleep/delay
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class BoardManager {
  constructor(programmer) {
    this.programmer = programmer;

    // jobs: jobId -> { boardId, filePath, originalName, createdAt }
    this.jobs = {};

    // ensure upload dir exists
    this.uploadDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }

    // sync hardware -> DB on startup (fire and forget)
    // Add a small delay to let USB subsystem initialize
    setTimeout(() => {
      this._syncBoardsFromHardware().catch((err) => {
        console.error("[BoardManager] Failed to sync boards from hardware:", err);
      });
    }, 1000);

    // start lease expiry timer
    setInterval(() => {
      this._checkLeases().catch((err) =>
        console.error("[BoardManager] lease check failed:", err)
      );
    }, 10_000);
  }

  /**
   * Use `openFPGALoader --scan-usb` to discover connected boards.
   * Builds board IDs like: CmodA7-<serial> or CmodA7-<bus>-<dev>.
   */
  _detectBoards() {
    let output;
    try {
      output = execSync("openFPGALoader --scan-usb", { 
        encoding: "utf8",
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (err) {
      console.error(
        "[BoardManager] Failed to run `openFPGALoader --scan-usb`:",
        err.message || err
      );
      // Log stderr if available
      if (err.stderr) {
        console.error("[BoardManager] stderr:", err.stderr.toString());
      }
      return [];
    }

    const lines = output
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    console.log(`[BoardManager] Raw openFPGALoader output (${lines.length} lines):`, output);

    const boards = [];

    for (const line of lines) {
      if (line.startsWith("empty")) continue;
      if (line.startsWith("Bus device")) continue;

      const parts = line.split(/\s+/);
      if (parts.length < 6) continue;

      const [bus, dev, vidpid, probeType, manufacturer, serial, ...productParts] =
        parts;
      const product = productParts.join(" ");

      const id = serial ? `CmodA7-${serial}` : `CmodA7-${bus}-${dev}`;

      boards.push({
        id,
        hw: {
          bus,
          dev,
          vidpid,
          probeType,
          manufacturer,
          serial,
          product,
        },
      });
    }

    console.log(
      "[BoardManager] Detected boards:",
      boards.map((b) => b.id)
    );

    return boards;
  }

  /**
   * Insert/update detected boards into the DB.
   * - New boards -> insert with status READY
   * - Existing boards -> keep status/lease, just refresh HW metadata
   * - Retries up to 3 times with 2 second delay between attempts
   */
  async _syncBoardsFromHardware() {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    let detected = [];

    // Try up to 3 times to detect boards
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[BoardManager] Board detection attempt ${attempt}/${maxRetries}`);
      
      detected = this._detectBoards();

      if (detected.length > 0) {
        console.log(`[BoardManager] Successfully detected ${detected.length} board(s) on attempt ${attempt}`);
        break;
      }

      if (attempt < maxRetries) {
        console.log(`[BoardManager] No boards detected, waiting ${retryDelay}ms before retry...`);
        await sleep(retryDelay);
      }
    }

    if (detected.length === 0) {
      console.warn(
        "[BoardManager] No hardware boards detected after 3 attempts. /api/boards will be empty until something is plugged in."
      );
      return;
    }

    for (const b of detected) {
      const existing = await dbGet("SELECT * FROM boards WHERE id = ?", [
        b.id,
      ]);

      if (!existing) {
        await dbRun(
          `INSERT INTO boards (
            id, status, userid, ip, lease_since, lease_until, last_error, current_job_id,
            bus, dev, vidpid, probe_type, manufacturer, serial, product
          ) VALUES (?, 'READY', NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ?)`,
          [
            b.id,
            b.hw.bus,
            b.hw.dev,
            b.hw.vidpid,
            b.hw.probeType,
            b.hw.manufacturer,
            b.hw.serial,
            b.hw.product,
          ]
        );
      } else {
        // keep status/lease, just refresh hardware metadata
        await dbRun(
          `UPDATE boards SET
             bus = ?, dev = ?, vidpid = ?, probe_type = ?, manufacturer = ?, serial = ?, product = ?
           WHERE id = ?`,
          [
            b.hw.bus,
            b.hw.dev,
            b.hw.vidpid,
            b.hw.probeType,
            b.hw.manufacturer,
            b.hw.serial,
            b.hw.product,
            b.id,
          ]
        );
      }
    }
  }

  async _checkLeases() {
    const now = Date.now();

    const rows = await dbAll(
      "SELECT * FROM boards WHERE lease_until IS NOT NULL AND lease_until <= ?",
      [now]
    );

    for (const row of rows) {
      console.log(`[LEASE] Auto-releasing board ${row.id}`);
      await this.releaseBoard(row.id);
    }
  }

  async getBoards() {
    const rows = await dbAll("SELECT * FROM boards", []);
    return rows.map(rowToBoard);
  }

  async getBoard(id) {
    const row = await dbGet("SELECT * FROM boards WHERE id = ?", [id]);
    if (!row) {
      throw new Error(`Board ${id} not found`);
    }
    return rowToBoard(row);
  }

  async claimBoard(id, { userid, ip, leaseMinutes = 30 }) {
    const user = await dbGet("SELECT * FROM users WHERE id = ?", [userid]);
    if (!user) {
      throw new Error("User not registered");
    }

    const row = await dbGet("SELECT * FROM boards WHERE id = ?", [id]);
    if (!row) throw new Error(`Board ${id} not found`);
    if (row.status !== "READY") throw new Error(`Board ${id} is not available`);

    // Optional: enforce 1 board per user
    const other = await dbGet(
      "SELECT * FROM boards WHERE userid = ? AND id <> ?",
      [userid, id]
    );
    if (other) {
      throw new Error("User already has a board reserved");
    }

    const now = Date.now();
    const leaseMs = leaseMinutes * 60 * 1000;
    const leaseUntil = now + leaseMs;

    await dbRun(
      `UPDATE boards
       SET status = 'BUSY',
           userid = ?,
           ip = ?,
           lease_since = ?,
           lease_until = ?,
           last_error = NULL
       WHERE id = ?`,
      [userid, ip, now, leaseUntil, id]
    );

    await dbRun(
      `UPDATE users SET current_board_id = ? WHERE id = ?`,
      [id, userid]
    );

    const updated = await dbGet("SELECT * FROM boards WHERE id = ?", [id]);
    return rowToBoard(updated);
  }

  async releaseBoard(id) {
    const row = await dbGet("SELECT * FROM boards WHERE id = ?", [id]);
    if (!row) {
      throw new Error(`Board ${id} not found`);
    }

    const userid = row.userid;

    await dbRun(
      `UPDATE boards
       SET status = 'READY',
           userid = NULL,
           ip = NULL,
           lease_since = NULL,
           lease_until = NULL,
           current_job_id = NULL,
           last_error = NULL
       WHERE id = ?`,
      [id]
    );

    if (userid) {
      await dbRun(
        `UPDATE users SET current_board_id = NULL WHERE id = ?`,
        [userid]
      );
    }

    const updated = await dbGet("SELECT * FROM boards WHERE id = ?", [id]);
    return rowToBoard(updated);
  }

  async registerUpload(boardId, file) {
    if (!file) {
      throw new Error("No file uploaded");
    }

    const row = await dbGet("SELECT * FROM boards WHERE id = ?", [boardId]);
    if (!row) {
      throw new Error(`Board ${boardId} not found`);
    }

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

    await dbRun(
      `UPDATE boards SET current_job_id = ? WHERE id = ?`,
      [jobId, boardId]
    );

    const updated = await dbGet("SELECT * FROM boards WHERE id = ?", [
      boardId,
    ]);
    return { jobId, board: rowToBoard(updated) };
  }

  async flashBoard(boardId, jobId) {
    const row = await dbGet("SELECT * FROM boards WHERE id = ?", [boardId]);
    if (!row) {
      throw new Error(`Board ${boardId} not found`);
    }

    const job = this.jobs[jobId];
    if (!job || job.boardId !== boardId) {
      throw new Error("Job not found for this board");
    }

    // mark as FLASHING
    await dbRun(
      `UPDATE boards SET status = 'FLASHING', last_error = NULL WHERE id = ?`,
      [boardId]
    );

    try {
      await this.programmer.flashBitstream(boardId, job.filePath);

      await dbRun(
        `UPDATE boards SET status = 'READY' WHERE id = ?`,
        [boardId]
      );
    } catch (err) {
      console.error(`[FLASH] Error flashing ${boardId}:`, err);
      await dbRun(
        `UPDATE boards SET status = 'ERROR', last_error = ? WHERE id = ?`,
        [err.message || "Flash failed", boardId]
      );
      throw err;
    }

    const updated = await dbGet("SELECT * FROM boards WHERE id = ?", [
      boardId,
    ]);
    return rowToBoard(updated);
  }

  async rebootBoard(boardId) {
    const row = await dbGet("SELECT * FROM boards WHERE id = ?", [boardId]);
    if (!row) throw new Error(`Board ${boardId} not found`);

    if (row.status === "FLASHING") {
      throw new Error("Cannot reboot while flashing");
    }

    await this.programmer.rebootBoard(boardId);

    // after reboot, treat as released
    return this.releaseBoard(boardId);
  }

  /**
   * Manual rescan endpoint - useful for hot-plugging boards after startup
   */
  async rescanBoards() {
    console.log("[BoardManager] Manual board rescan triggered");
    await this._syncBoardsFromHardware();
    return this.getBoards();
  }
}

module.exports = BoardManager;