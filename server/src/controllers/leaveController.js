const { validationResult } = require("express-validator");
const { Leave } = require("../models/Leave");
const { Employee } = require("../models/Employee");

function ensureValid(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    const err = new Error(first.msg);
    err.statusCode = 400;
    throw err;
  }
}

function inclusiveDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const ms = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

async function applyLeave(req, res, next) {
  try {
    ensureValid(req);
    if (!req.user.employeeId) {
      res.status(400);
      throw new Error("Your account is not linked to an employee profile");
    }

    const { type, startDate, endDate, reason } = req.body;
    const days = inclusiveDays(startDate, endDate);

    const employee = await Employee.findById(req.user.employeeId);
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }

    const balanceKey = type.toLowerCase();
    if (type !== "UNPAID" && employee.leaveBalance[balanceKey] < days) {
      res.status(400);
      throw new Error("Insufficient leave balance");
    }

    const leave = await Leave.create({
      employeeId: req.user.employeeId,
      type,
      startDate,
      endDate,
      reason,
      days,
    });

    res.status(201).json({ leave });
  } catch (e) {
    next(e);
  }
}

async function listLeaves(req, res, next) {
  try {
    const filter = {};
    if (req.user.role === "EMPLOYEE") {
      if (!req.user.employeeId) {
        res.status(400);
        throw new Error("Your account is not linked to an employee profile");
      }
      filter.employeeId = req.user.employeeId;
    } else if (req.query.employeeId) {
      filter.employeeId = String(req.query.employeeId);
    }
    if (req.query.status) filter.status = String(req.query.status);

    const leaves = await Leave.find(filter)
      .sort({ createdAt: -1 })
      .populate("employeeId", "name email department position")
      .populate("decidedByUserId", "name email");

    res.json({ leaves });
  } catch (e) {
    next(e);
  }
}

async function setLeaveStatus(req, res, next) {
  try {
    ensureValid(req);
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      res.status(404);
      throw new Error("Leave request not found");
    }

    if (leave.status !== "PENDING") {
      res.status(400);
      throw new Error("Leave request already decided");
    }

    const { status, decisionNote } = req.body;
    leave.status = status;
    leave.decisionNote = decisionNote || "";
    leave.decidedByUserId = req.user._id;
    await leave.save();

    if (status === "APPROVED") {
      const employee = await Employee.findById(leave.employeeId);
      if (employee) {
        const balanceKey = leave.type.toLowerCase();
        if (leave.type !== "UNPAID") {
          employee.leaveBalance[balanceKey] = Math.max(0, employee.leaveBalance[balanceKey] - leave.days);
        }
        await employee.save();
      }
    }

    const populated = await Leave.findById(leave._id)
      .populate("employeeId", "name email department position")
      .populate("decidedByUserId", "name email");

    res.json({ leave: populated });
  } catch (e) {
    next(e);
  }
}

async function balance(req, res, next) {
  try {
    if (!req.user.employeeId) {
      res.status(400);
      throw new Error("Your account is not linked to an employee profile");
    }
    const employee = await Employee.findById(req.user.employeeId).select("leaveBalance name email");
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }
    res.json({ employeeId: employee._id, leaveBalance: employee.leaveBalance });
  } catch (e) {
    next(e);
  }
}

module.exports = { applyLeave, listLeaves, setLeaveStatus, balance };

