const { Attendance } = require("../models/Attendance");
const { Employee } = require("../models/Employee");

function dateKeyFromDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function monthKeyFromDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

async function checkIn(req, res, next) {
  try {
    if (!req.user.employeeId) {
      res.status(400);
      throw new Error("Your account is not linked to an employee profile");
    }
    const now = new Date();
    const dateKey = dateKeyFromDate(now);

    const attendance = await Attendance.findOneAndUpdate(
      { employeeId: req.user.employeeId, dateKey },
      { $setOnInsert: { employeeId: req.user.employeeId, dateKey }, $set: { checkInAt: now, status: "PRESENT" } },
      { upsert: true, new: true }
    );

    res.json({ attendance });
  } catch (e) {
    next(e);
  }
}

async function checkOut(req, res, next) {
  try {
    if (!req.user.employeeId) {
      res.status(400);
      throw new Error("Your account is not linked to an employee profile");
    }
    const now = new Date();
    const dateKey = dateKeyFromDate(now);

    const attendance = await Attendance.findOne({ employeeId: req.user.employeeId, dateKey });
    if (!attendance || !attendance.checkInAt) {
      res.status(400);
      throw new Error("No check-in found for today");
    }

    attendance.checkOutAt = now;
    const minutes = Math.max(0, Math.round((attendance.checkOutAt - attendance.checkInAt) / 60000));
    attendance.totalMinutes = minutes;
    await attendance.save();

    res.json({ attendance });
  } catch (e) {
    next(e);
  }
}

async function daily(req, res, next) {
  try {
    const date = req.query.date ? new Date(String(req.query.date)) : new Date();
    if (Number.isNaN(date.getTime())) {
      res.status(400);
      throw new Error("Invalid date");
    }
    const dateKey = dateKeyFromDate(date);

    const filter = { dateKey };
    if (req.user.role === "EMPLOYEE") {
      if (!req.user.employeeId) {
        res.status(400);
        throw new Error("Your account is not linked to an employee profile");
      }
      filter.employeeId = req.user.employeeId;
    }

    const records = await Attendance.find(filter).populate("employeeId", "name email department position");
    res.json({ dateKey, records });
  } catch (e) {
    next(e);
  }
}

async function monthly(req, res, next) {
  try {
    const monthKey = String(req.query.month || monthKeyFromDate(new Date()));
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      res.status(400);
      throw new Error("Invalid month. Use YYYY-MM");
    }

    const filter = { dateKey: { $regex: `^${monthKey}-` } };
    if (req.user.role === "EMPLOYEE") {
      if (!req.user.employeeId) {
        res.status(400);
        throw new Error("Your account is not linked to an employee profile");
      }
      filter.employeeId = req.user.employeeId;
    } else if (req.query.employeeId) {
      filter.employeeId = String(req.query.employeeId);
    }

    const records = await Attendance.find(filter)
      .sort({ dateKey: 1 })
      .populate("employeeId", "name email department position");

    const totalMinutes = records.reduce((acc, r) => acc + (r.totalMinutes || 0), 0);
    res.json({ monthKey, records, totalMinutes });
  } catch (e) {
    next(e);
  }
}

async function backfillAbsent(req, res, next) {
  try {
    // HR utility: create ABSENT records for all active employees on a date (if none exists).
    const date = req.body.date ? new Date(String(req.body.date)) : new Date();
    if (Number.isNaN(date.getTime())) {
      res.status(400);
      throw new Error("Invalid date");
    }
    const dateKey = dateKeyFromDate(date);
    const employees = await Employee.find({ isActive: true }).select("_id");
    const ops = employees.map((e) => ({
      updateOne: {
        filter: { employeeId: e._id, dateKey },
        update: { $setOnInsert: { employeeId: e._id, dateKey, status: "ABSENT" } },
        upsert: true,
      },
    }));
    if (ops.length) await Attendance.bulkWrite(ops);
    res.json({ ok: true, dateKey, employees: ops.length });
  } catch (e) {
    next(e);
  }
}

module.exports = { checkIn, checkOut, daily, monthly, backfillAbsent };

