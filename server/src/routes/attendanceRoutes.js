const express = require("express");
const { body } = require("express-validator");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { checkIn, checkOut, daily, monthly, backfillAbsent } = require("../controllers/attendanceController");

const router = express.Router();

router.post("/check-in", protect, checkIn);
router.post("/check-out", protect, checkOut);
router.get("/daily", protect, daily);
router.get("/monthly", protect, monthly);

router.post(
  "/backfill-absent",
  protect,
  requireRole("ADMIN", "HR"),
  [body("date").optional().isISO8601().withMessage("date must be ISO8601")],
  backfillAbsent
);

module.exports = router;

