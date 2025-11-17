// backend/config/adminDb.js
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "..", "pibitstreamer.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // ---- Admins table (existing) ----
  db.run(
    `CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );

  // ---- Boards table (NEW) ----
  db.run(
    `CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      userid TEXT,
      ip TEXT,
      lease_since INTEGER,
      lease_until INTEGER,
      last_error TEXT,
      current_job_id TEXT,
      bus TEXT,
      dev TEXT,
      vidpid TEXT,
      probe_type TEXT,
      manufacturer TEXT,
      serial TEXT,
      product TEXT
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      current_board_id TEXT,
      last_ip TEXT,
      last_seen_at INTEGER,
      created_at INTEGER DEFAULT (strftime('%s','now'))
    )`
  );


  const defaultUser = process.env.ADMIN_USER || "admin";
  const defaultPass = process.env.ADMIN_PASSWORD || "admin";

  // Create a default admin if it doesn't exist
  db.get(
    "SELECT id FROM admins WHERE username = ?",
    [defaultUser],
    (err, row) => {
      if (err) {
        console.error("Error checking default admin:", err);
        return;
      }
      if (!row) {
        bcrypt
          .hash(defaultPass, 10)
          .then((hash) => {
            db.run(
              "INSERT INTO admins (username, password_hash) VALUES (?, ?)",
              [defaultUser, hash],
              (err2) => {
                if (err2) {
                  console.error("Error creating default admin:", err2);
                } else {
                  console.log(
                    `Created default admin '${defaultUser}' (change password in .env!)`
                  );
                }
              }
            );
          })
          .catch((e) =>
            console.error("Error hashing default admin password:", e)
          );
      }
    }
  );
});

module.exports = db;
