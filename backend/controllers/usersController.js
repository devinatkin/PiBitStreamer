// backend/controllers/usersController.js
const db = require("../config/adminDb");

const dbGet = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

const dbRun = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });

async function registerUser(req, res) {
  const { id, username } = req.body;
  const ip = req.ip;

  if (!id || !username) {
    return res
      .status(400)
      .json({ success: false, message: "Missing id or username" });
  }

  try {
    const existing = await dbGet("SELECT * FROM users WHERE id = ?", [id]);
    const now = Date.now();

    if (existing) {
      // update last_seen
      await dbRun(
        "UPDATE users SET last_ip = ?, last_seen_at = ? WHERE id = ?",
        [ip, now, id]
      );
      return res.json({
        success: true,
        user: { ...existing, last_ip: ip, last_seen_at: now },
      });
    }

    await dbRun(
      `INSERT INTO users (id, username, last_ip, last_seen_at)
       VALUES (?, ?, ?, ?)`,
      [id, username, ip, now]
    );
    const user = await dbGet("SELECT * FROM users WHERE id = ?", [id]);

    res.json({ success: true, user });
  } catch (err) {
    console.error("registerUser error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to register user" });
  }
}

module.exports = { registerUser };
