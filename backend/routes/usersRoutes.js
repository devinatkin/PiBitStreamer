// backend/routes/usersRoutes.js
const express = require("express");
const { registerUser } = require("../controllers/usersController");

const router = express.Router();

router.post("/register", registerUser);

module.exports = router;