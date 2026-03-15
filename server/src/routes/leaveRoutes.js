const express = require("express");
const { body } = require("express-validator");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { applyLeave, listLeaves, setLeaveStatus, balance } = require("../controllers/leaveController");

const router = express.Router();

router.get("/", protect, listLeaves);
router.get("/balance", protect, balance);

router.post(
  "/",
  protect,
  [
    body("type").isIn(["ANNUAL", "SICK", "UNPAID"]).withMessage("Invalid leave type"),
    body("startDate").isISO8601().withMessage("startDate is required"),
    body("endDate").isISO8601().withMessage("endDate is required"),
    body("reason").optional().isString().isLength({ max: 500 }).withMessage("reason too long"),
  ],
  applyLeave
);

router.patch(
  "/:id/status",
  protect,
  requireRole("ADMIN", "HR"),
  [
    body("status").isIn(["APPROVED", "REJECTED"]).withMessage("Invalid status"),
    body("decisionNote").optional().isString().isLength({ max: 500 }).withMessage("decisionNote too long"),
  ],
  setLeaveStatus
);

module.exports = router;

