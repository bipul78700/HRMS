const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    monthKey: { type: String, required: true, index: true }, // YYYY-MM
    baseSalary: { type: Number, required: true, min: 0 },
    unpaidLeaveDays: { type: Number, default: 0, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    allowances: { type: Number, default: 0, min: 0 },
    netPay: { type: Number, required: true, min: 0 },
    generatedAt: { type: Date, default: Date.now },
    payslip: {
      employeeName: String,
      department: String,
      position: String
    }
  },
  { timestamps: true }
);

payrollSchema.index({ employeeId: 1, monthKey: 1 }, { unique: true });

const Payroll = mongoose.model("Payroll", payrollSchema);

module.exports = { Payroll };

