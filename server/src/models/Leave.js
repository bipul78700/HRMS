const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    type: { type: String, enum: ["ANNUAL", "SICK", "UNPAID"], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reason: { type: String, trim: true, maxlength: 500 },
    days: { type: Number, required: true, min: 0.5 },
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING", index: true },
    decidedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decisionNote: { type: String, trim: true, maxlength: 500, default: "" }
  },
  { timestamps: true }
);

leaveSchema.index({ employeeId: 1, createdAt: -1 });

const Leave = mongoose.model("Leave", leaveSchema);

module.exports = { Leave };

