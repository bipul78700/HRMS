const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD in local timezone
    checkInAt: { type: Date, default: null },
    checkOutAt: { type: Date, default: null },
    totalMinutes: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["PRESENT", "ABSENT", "ON_LEAVE"], default: "PRESENT" },
  },
  { timestamps: true }
);

attendanceSchema.index({ employeeId: 1, dateKey: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = { Attendance };

