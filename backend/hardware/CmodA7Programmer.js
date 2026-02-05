// backend/hardware/CmodA7Programmer.js
const { spawn } = require("child_process");
const path = require("path");
const db = require("../config/adminDb");

// --- small promise helper for sqlite3 ---
const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

class CmodA7Programmer {
  constructor(options = {}) {
    this.status = {}; // boardId -> 'IDLE' | 'FLASHING' | 'OK' | 'ERROR' | 'REBOOTING'
    this.boardName = options.boardName || "Cmod-A7-35T";
    this.openFPGALoaderBin = options.openFPGALoaderBin || "openFPGALoader";
  }

  _setStatus(boardId, status) {
    this.status[boardId] = status;
  }

  async flashBitstream(boardId, bitPath, { flash = true } = {}) {
    console.log(`[CmodA7] Flashing ${bitPath} to ${boardId}...`);
    this._setStatus(boardId, "FLASHING");

    const absBitPath = path.resolve(bitPath);

    const args = ["-b", this.boardName];
    if (flash) {
      args.push("-f", "-r"); // flash + reset
    }
    args.push(absBitPath);

    await new Promise((resolve, reject) => {
      const proc = spawn(this.openFPGALoaderBin, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      proc.stdout.on("data", (data) => {
        process.stdout.write(`[CmodA7][${boardId}][stdout] ${data}`);
      });

      proc.stderr.on("data", (data) => {
        process.stderr.write(`[CmodA7][${boardId}][stderr] ${data}`);
      });

      proc.on("error", (err) => {
        console.error("[CmodA7] spawn error:", err);
        this._setStatus(boardId, "ERROR");
        reject(new Error("Failed to spawn openFPGALoader"));
      });

      proc.on("close", (code) => {
        if (code === 0) {
          console.log(`[CmodA7] Flash of ${boardId} completed successfully`);
          this._setStatus(boardId, "OK");
          resolve();
        } else {
          console.error(`[CmodA7] Flash failed with exit code ${code}`);
          this._setStatus(boardId, "ERROR");
          reject(new Error(`openFPGALoader exited with code ${code}`));
        }
      });
    });
  }

  /**
   * "Real" reboot: use openFPGALoader to detect the FPGA and reset it afterwards.
   * Targets the specific USB probe using the stored bus/dev in the DB.
   *
   * Equivalent CLI:
   *   openFPGALoader --busdev-num <bus:dev> --detect -r
   */
  async rebootBoard(boardId) {
    const row = await dbGet("SELECT bus, dev FROM boards WHERE id = ?", [boardId]);
    if (!row) {
      this._setStatus(boardId, "ERROR");
      throw new Error(`Board ${boardId} not found`);
    }
    if (!row.bus || !row.dev) {
      this._setStatus(boardId, "ERROR");
      throw new Error(`Missing bus/dev for ${boardId}`);
    }

    const busdev = `${row.bus}:${row.dev}`;
    const args = ["--busdev-num", busdev, "--detect", "-r"];

    console.log(`[CmodA7] Rebooting ${boardId} via openFPGALoader (${busdev})...`);
    this._setStatus(boardId, "REBOOTING");

    await new Promise((resolve, reject) => {
      const proc = spawn(this.openFPGALoaderBin, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      proc.stdout.on("data", (data) => {
        process.stdout.write(`[CmodA7][${boardId}][stdout] ${data}`);
      });

      proc.stderr.on("data", (data) => {
        process.stderr.write(`[CmodA7][${boardId}][stderr] ${data}`);
      });

      proc.on("error", (err) => {
        console.error("[CmodA7] spawn error:", err);
        this._setStatus(boardId, "ERROR");
        reject(new Error(`Failed to spawn openFPGALoader: ${err.message}`));
      });

      proc.on("close", (code) => {
        if (code === 0) {
          console.log(`[CmodA7] Reboot of ${boardId} completed successfully`);
          this._setStatus(boardId, "IDLE");
          resolve();
        } else {
          console.error(`[CmodA7] Reboot failed with exit code ${code}`);
          this._setStatus(boardId, "ERROR");
          reject(new Error(`openFPGALoader reboot failed (exit ${code})`));
        }
      });
    });
  }

  async getBoardStatus(boardId) {
    return this.status[boardId] || "IDLE";
  }
}

module.exports = CmodA7Programmer;