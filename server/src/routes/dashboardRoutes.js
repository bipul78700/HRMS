const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { summary } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/summary", protect, summary);

module.exports = router;

