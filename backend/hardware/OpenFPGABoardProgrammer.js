// backend/hardware/OpenFPGABoardProgrammer.js
const { spawn } = require("child_process");
const path = require("path");
const db = require("../config/adminDb");

// --- small promise helper for sqlite3 ---
const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

/**
 * OpenFPGABoardProgrammer
 *
 * Uses openFPGALoader to program/reboot a specific FTDI probe.
 * IMPORTANT: with multiple FTDI2232 devices connected, we MUST pin the target:
 *   - Prefer: --ftdi-serial <serial>   (stable)
 *   - Fallback: --busdev-num <bus:dev> (can change after replug/reboot)
 */
class OpenFPGABoardProgrammer {
  constructor(options = {}) {
    this.status = {}; // boardId -> 'IDLE' | 'FLASHING' | 'OK' | 'ERROR' | 'REBOOTING'

    // openFPGALoader board profile name (e.g. "cmoda7_15t")
    this.boardName = options.boardName || "cmoda7_15t";

    // openFPGALoader binary
    this.openFPGALoaderBin = options.openFPGALoaderBin || "openFPGALoader";

    // Cable profile: your tests show "digilent" works
    this.cable = options.cable || "digilent";

    // Optional: try FTDI channels in order (0=A, 1=B, etc.)
    // If you don't need this, set options.ftdiChannels = null (or [])
    this.ftdiChannels =
      options.ftdiChannels === undefined ? null : options.ftdiChannels;
  }

  _setStatus(boardId, status) {
    this.status[boardId] = status;
  }

  async _getHwSelector(boardId) {
    const row = await dbGet(
      "SELECT bus, dev, serial FROM boards WHERE id = ?",
      [boardId]
    );
    if (!row) throw new Error(`Board ${boardId} not found`);

    // Prefer stable selector:
    if (row.serial) {
      return { kind: "serial", value: String(row.serial).trim() };
    }

    // Fallback
    if (row.bus && row.dev) {
      return { kind: "busdev", value: `${row.bus}:${row.dev}` };
    }

    throw new Error(`Missing serial and bus/dev for ${boardId}`);
  }

  async _runOpenFPGALoader(boardId, args, { timeoutMs = 120000 } = {}) {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.openFPGALoaderBin, args, {
        stdio: ["ignore", "pipe", "pipe"],
      });

      const killTimer = setTimeout(() => {
        try {
          proc.kill("SIGKILL");
        } catch {}
        reject(
          new Error(
            `openFPGALoader timeout after ${timeoutMs}ms\nARGS=${args.join(" ")}`
          )
        );
      }, timeoutMs);

      proc.stdout.on("data", (data) => {
        process.stdout.write(`[OpenFPGA][${boardId}][stdout] ${data}`);
      });

      proc.stderr.on("data", (data) => {
        process.stderr.write(`[OpenFPGA][${boardId}][stderr] ${data}`);
      });

      proc.on("error", (err) => {
        clearTimeout(killTimer);
        reject(new Error(`Failed to spawn openFPGALoader: ${err.message}`));
      });

      proc.on("close", (code) => {
        clearTimeout(killTimer);
        if (code === 0) return resolve();
        reject(
          new Error(
            `openFPGALoader exited with code ${code}\nARGS=${args.join(" ")}`
          )
        );
      });
    });
  }

  /**
   * Flash / program bitstream.
   *
   * Default: flash=true means program SPI flash (-f) and reset (-r)
   * If you want SRAM-only programming, call flashBitstream(boardId, bitPath, { flash: false })
   */
  async flashBitstream(boardId, bitPath, { flash = true } = {}) {
    console.log(`[OpenFPGA] Programming ${bitPath} -> ${boardId}...`);
    this._setStatus(boardId, "FLASHING");

    const absBitPath = path.resolve(bitPath);
    const sel = await this._getHwSelector(boardId);

    // Build selector args (serial preferred)
    const base = ["--cable", this.cable];
    if (sel.kind === "serial") base.push("--ftdi-serial", sel.value);
    else base.push("--busdev-num", sel.value);

    // openFPGALoader args:
    //   openFPGALoader [selector] -b <board> (-f -r)? <bit>
    const programArgs = ["-b", this.boardName];
    if (flash) programArgs.push("-f", "-r");
    programArgs.push(absBitPath);

    // If channels not provided, just run once
    if (!Array.isArray(this.ftdiChannels) || this.ftdiChannels.length === 0) {
      const args = [...base, ...programArgs];
      console.log(`[OpenFPGA] CMD: ${this.openFPGALoaderBin} ${args.join(" ")}`);
      try {
        await this._runOpenFPGALoader(boardId, args);
        console.log(`[OpenFPGA] Program of ${boardId} completed successfully`);
        this._setStatus(boardId, "OK");
        return;
      } catch (err) {
        this._setStatus(boardId, "ERROR");
        throw err;
      }
    }

    // Otherwise try channels in order (0=A, 1=B, ...)
    let lastErr = null;
    for (const ch of this.ftdiChannels) {
      const args = [...base, "--ftdi-channel", String(ch), ...programArgs];
      console.log(
        `[OpenFPGA] CMD: ${this.openFPGALoaderBin} ${args.join(
          " "
        )} (channel=${ch})`
      );
      try {
        await this._runOpenFPGALoader(boardId, args);
        console.log(
          `[OpenFPGA] Program of ${boardId} completed successfully (channel=${ch})`
        );
        this._setStatus(boardId, "OK");
        return;
      } catch (err) {
        lastErr = err;
      }
    }

    console.error(`[OpenFPGA] Program failed for ${boardId} after channel tries`);
    this._setStatus(boardId, "ERROR");
    throw lastErr || new Error("openFPGALoader failed");
  }

  /**
   * Reboot/reset a board by running detect + reset (-r) against the pinned probe.
   *
   * Equivalent CLI:
   *   openFPGALoader --ftdi-serial <serial> --cable digilent --detect -r
   * or
   *   openFPGALoader --busdev-num <bus:dev> --cable digilent --detect -r
   */
  async rebootBoard(boardId) {
    const sel = await this._getHwSelector(boardId);

    const base = ["--cable", this.cable];
    if (sel.kind === "serial") base.push("--ftdi-serial", sel.value);
    else base.push("--busdev-num", sel.value);

    const rebootArgs = ["--detect", "-r"];

    console.log(`[OpenFPGA] Rebooting ${boardId} via openFPGALoader...`);
    this._setStatus(boardId, "REBOOTING");

    // Same channel logic as programming (if configured)
    if (!Array.isArray(this.ftdiChannels) || this.ftdiChannels.length === 0) {
      const args = [...base, ...rebootArgs];
      console.log(`[OpenFPGA] CMD: ${this.openFPGALoaderBin} ${args.join(" ")}`);
      try {
        await this._runOpenFPGALoader(boardId, args, { timeoutMs: 30000 });
        console.log(`[OpenFPGA] Reboot of ${boardId} completed successfully`);
        this._setStatus(boardId, "IDLE");
        return;
      } catch (err) {
        this._setStatus(boardId, "ERROR");
        throw err;
      }
    }

    let lastErr = null;
    for (const ch of this.ftdiChannels) {
      const args = [...base, "--ftdi-channel", String(ch), ...rebootArgs];
      console.log(
        `[OpenFPGA] CMD: ${this.openFPGALoaderBin} ${args.join(
          " "
        )} (channel=${ch})`
      );
      try {
        await this._runOpenFPGALoader(boardId, args, { timeoutMs: 30000 });
        console.log(
          `[OpenFPGA] Reboot of ${boardId} completed successfully (channel=${ch})`
        );
        this._setStatus(boardId, "IDLE");
        return;
      } catch (err) {
        lastErr = err;
      }
    }

    this._setStatus(boardId, "ERROR");
    throw lastErr || new Error("openFPGALoader reboot failed");
  }

  async getBoardStatus(boardId) {
    return this.status[boardId] || "IDLE";
  }
}

module.exports = OpenFPGABoardProgrammer;