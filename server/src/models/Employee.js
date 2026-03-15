const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, maxlength: 30 },
    department: { type: String, required: true, trim: true, maxlength: 80 },
    position: { type: String, required: true, trim: true, maxlength: 80 },
    joiningDate: { type: Date, required: true },
    salary: { type: Number, required: true, min: 0 },
    leaveBalance: {
      annual: { type: Number, default: 24, min: 0 },
      sick: { type: Number, default: 10, min: 0 },
      unpaid: { type: Number, default: 9999, min: 0 }
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

employeeSchema.index({ name: "text", email: "text", department: "text", position: "text" });

const Employee = mongoose.model("Employee", employeeSchema);

module.exports = { Employee };

