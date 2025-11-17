// backend/hardware/FakeProgrammer.js
class FakeProgrammer {
  constructor() {
    this.status = {}; // boardId -> 'IDLE' | 'FLASHING' | 'OK' | 'ERROR'
  }

  async flashBitstream(boardId, bitPath) {
    console.log(`[FAKE] Flashing ${bitPath} to ${boardId}...`);
    this.status[boardId] = "FLASHING";

    // simulate flashing delay
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // simulate success
    this.status[boardId] = "OK";
    console.log(`[FAKE] Flash of ${boardId} completed successfully`);
  }

  async rebootBoard(boardId) {
    console.log(`[FAKE] Rebooting board ${boardId}...`);
    this.status[boardId] = "IDLE";
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log(`[FAKE] Reboot of ${boardId} done`);
  }

  async getBoardStatus(boardId) {
    return this.status[boardId] || "IDLE";
  }
}

module.exports = FakeProgrammer;
