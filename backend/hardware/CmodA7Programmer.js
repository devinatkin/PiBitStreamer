// backend/hardware/CmodA7Programmer.js
const { spawn } = require("child_process");
const path = require("path");

class CmodA7Programmer {
  constructor(options = {}) {
    this.status = {}; // boardId -> 'IDLE' | 'FLASHING' | 'OK' | 'ERROR'
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

  async rebootBoard(boardId) {
    // For now: “logical” reboot — mark idle.
    // If you need a real reset, you can re-run openFPGALoader with a small helper.
    console.log(`[CmodA7] Reboot (logical) board ${boardId} -> IDLE`);
    this._setStatus(boardId, "IDLE");
  }

  async getBoardStatus(boardId) {
    return this.status[boardId] || "IDLE";
  }
}

module.exports = CmodA7Programmer;