const crypto = require("crypto");
const { validationResult } = require("express-validator");
const { User } = require("../models/User");
const { Employee } = require("../models/Employee");
const { signAccessToken } = require("../utils/jwt");

function pickValidationErrors(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    const err = new Error(first.msg);
    err.statusCode = 400;
    throw err;
  }
}

async function register(req, res, next) {
  try {
    pickValidationErrors(req);
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existing) {
      res.status(409);
      throw new Error("Email already registered");
    }

    // Public registration creates an EMPLOYEE user without an HR-managed Employee profile.
    // HR/Admin can create full Employee records via /api/employees.
    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash,
      role: "EMPLOYEE",
      employeeId: null,
    });

    const token = signAccessToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, employeeId: user.employeeId },
    });
  } catch (e) {
    next(e);
  }
}

async function login(req, res, next) {
  try {
    pickValidationErrors(req);
    const { email, password } = req.body;

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user || !user.isActive) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    const ok = await user.verifyPassword(password);
    if (!ok) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    const token = signAccessToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, employeeId: user.employeeId },
    });
  } catch (e) {
    next(e);
  }
}

async function me(req, res, next) {
  try {
    const user = req.user;
    let employee = null;
    if (user.employeeId) employee = await Employee.findById(user.employeeId);
    res.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, employeeId: user.employeeId },
      employee,
    });
  } catch (e) {
    next(e);
  }
}

async function forgotPassword(req, res, next) {
  try {
    pickValidationErrors(req);
    const { email } = req.body;
    const user = await User.findOne({ email: String(email).toLowerCase().trim(), isActive: true });

    // For privacy we always respond 200, even if user not found.
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      user.passwordResetToken = token;
      user.passwordResetExpires = expires;
      await user.save();

      // In a real app you'd email the token. For this demo we return it
      // so the frontend can show it once in a developer-friendly way.
      return res.json({
        message: "If that email exists, a reset token has been generated.",
        resetToken: token,
      });
    }

    res.json({ message: "If that email exists, a reset token has been generated." });
  } catch (e) {
    next(e);
  }
}

async function resetPassword(req, res, next) {
  try {
    pickValidationErrors(req);
    const { token, password } = req.body;
    const now = new Date();
    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: now },
      isActive: true,
    });
    if (!user) {
      res.status(400);
      throw new Error("Invalid or expired reset token");
    }

    user.passwordHash = await User.hashPassword(password);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    const jwtToken = signAccessToken(user);
    res.json({
      message: "Password updated successfully.",
      token: jwtToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, employeeId: user.employeeId },
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { register, login, me, forgotPassword, resetPassword };

