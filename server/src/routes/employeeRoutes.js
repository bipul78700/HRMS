const express = require("express");
const { body } = require("express-validator");
const { protect, requireRole } = require("../middleware/authMiddleware");
const {
  listEmployees,
  getEmployee,
  getMyEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeeController");

const router = express.Router();

router.get("/me", protect, getMyEmployee);

router.get("/", protect, requireRole("ADMIN", "HR"), listEmployees);
router.get("/:id", protect, requireRole("ADMIN", "HR"), getEmployee);

router.post(
  "/",
  protect,
  requireRole("ADMIN", "HR"),
  [
    body("name").isString().isLength({ min: 2, max: 120 }).withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("department").isString().isLength({ min: 2, max: 80 }).withMessage("Department is required"),
    body("position").isString().isLength({ min: 2, max: 80 }).withMessage("Position is required"),
    body("joiningDate").isISO8601().withMessage("Joining date is required"),
    body("salary").isNumeric().withMessage("Salary is required"),
  ],
  createEmployee
);

router.put(
  "/:id",
  protect,
  requireRole("ADMIN", "HR"),
  [
    body("email").optional().isEmail().withMessage("Valid email required"),
    body("salary").optional().isNumeric().withMessage("Salary must be numeric"),
    body("joiningDate").optional().isISO8601().withMessage("Joining date must be ISO date"),
  ],
  updateEmployee
);

router.delete("/:id", protect, requireRole("ADMIN", "HR"), deleteEmployee);

module.exports = router;

