const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// ADMIN: full system control
// HR: HR operations (employees, leaves, payroll) but not system-level admin
// EMPLOYEE: self-service portal
const USER_ROLES = ["ADMIN", "HR", "EMPLOYEE"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: "EMPLOYEE" },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    isActive: { type: Boolean, default: true },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.methods.verifyPassword = async function verifyPassword(password) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

const User = mongoose.model("User", userSchema);

module.exports = { User, USER_ROLES };

