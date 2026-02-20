// backend/hardware/detectOpenFPGABoards.js
const { spawn } = require("child_process");

function run(cmd, args, timeoutMs = 6000) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";

    const t = setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch {}
      resolve({ code: 124, out, err: err + "\n[TIMEOUT]" });
    }, timeoutMs);

    proc.stdout.on("data", (d) => (out += d.toString()));
    proc.stderr.on("data", (d) => (err += d.toString()));
    proc.on("close", (code) => {
      clearTimeout(t);
      resolve({ code, out, err });
    });
    proc.on("error", () => {
      clearTimeout(t);
      resolve({ code: 127, out, err: err + "\n[SPAWN ERROR]" });
    });
  });
}

function parseDetectOutput(text) {
  // Example chunk:
  // index 0:
  //   idcode 0x362d093
  //   manufacturer xilinx
  //   family artix a7 35t
  //   model  xc7a35
  //   irlength 6
  const m = {};
  const idx = text.match(/index\s+0:/);
  if (!idx) return null;

  const idcode = text.match(/idcode\s+(0x[0-9a-fA-F]+)/);
  const manufacturer = text.match(/manufacturer\s+([^\n\r]+)/);
  const family = text.match(/family\s+([^\n\r]+)/);
  const model = text.match(/model\s+([^\n\r]+)/);
  const irlength = text.match(/irlength\s+(\d+)/);

  if (idcode) m.idcode = idcode[1];
  if (manufacturer) m.manufacturer = manufacturer[1].trim();
  if (family) m.family = family[1].trim();
  if (model) m.model = model[1].trim();
  if (irlength) m.irlength = Number(irlength[1]);

  // Consider it a success if we got at least idcode+model/manufacturer
  if (!m.idcode && !m.model && !m.manufacturer) return null;
  return m;
}

async function listBusDevsForFtdi6010() {
  // Parse `lsusb -d 0403:6010` lines: "Bus 001 Device 065: ..."
  const { out } = await run("bash", ["-lc", "lsusb -d 0403:6010 || true"], 3000);
  return out
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const bus = l.match(/Bus\s+(\d+)/)?.[1];
      const dev = l.match(/Device\s+(\d+):/)?.[1];
      if (!bus || !dev) return null;
      return `${bus}:${dev}`;
    })
    .filter(Boolean);
}

async function detectBoards({
  openFPGALoaderBin = "openFPGALoader",
  busdevs = null,
  cablesToTry = ["digilent", "ft2232"], // add more later if needed
  freqHz = null,
} = {}) {
  const targets = busdevs ?? (await listBusDevsForFtdi6010());
  const results = [];

  for (const busdev of targets) {
    let detected = null;

    for (const cable of cablesToTry) {
      const args = [];
      if (cable) args.push("--cable", cable);
      args.push("--busdev-num", busdev);
      if (freqHz) args.push("--freq", String(freqHz));
      args.push("--detect");

      const { out, err } = await run(openFPGALoaderBin, args, 6000);
      const parsed = parseDetectOutput(out + "\n" + err);

      if (parsed) {
        detected = {
          busdev,
          cable,
          ...parsed,
          raw: (out + "\n" + err).trim(),
        };
        break;
      }
    }

    if (detected) results.push(detected);
  }

  return results;
}

// If you run this file directly: `node detectOpenFPGABoards.js`
if (require.main === module) {
  (async () => {
    const boards = await detectBoards({ cablesToTry: ["digilent", "ft2232"], freqHz: 1000000 });
    console.log(JSON.stringify({ ok: true, boards }, null, 2));
  })();
}

module.exports = { detectBoards };
