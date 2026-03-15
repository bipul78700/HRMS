const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { generatePayroll, listPayroll, getMyPayroll, downloadPayslipPdf } = require("../controllers/payrollController");

const router = express.Router();

router.get("/", protect, listPayroll);
router.get("/me", protect, getMyPayroll);
router.post("/generate/:employeeId", protect, requireRole("ADMIN", "HR"), generatePayroll);
router.get("/:id/pdf", protect, downloadPayslipPdf);

module.exports = router;

