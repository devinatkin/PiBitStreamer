// backend/controllers/adminController.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../config/adminDb");

// Helper to use db.get with async/await
function getAdminByUsername(username) {
  return new Promise((resolve, reject) => {
    db.get(
      "SELECT id, username, password_hash FROM admins WHERE username = ?",
      [username],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
}

// POST /api/admin/login
// Body: { username, password }
const loginAdmin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Please add all fields" });
  }

  try {
    const user = await getAdminByUsername(username);

    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      id: user.id,
      username: user.username,
      role: "admin",
      token,
    });
  } catch (err) {
    console.error("Error in loginAdmin:", err);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = { loginAdmin };
