const { Employee } = require("../models/Employee");
const { Leave } = require("../models/Leave");
const { Attendance } = require("../models/Attendance");

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

async function summary(req, res, next) {
  try {
    const todayKey = dateKeyFromDate(new Date());
    const monthKey = monthKeyFromDate(new Date());

    if (req.user.role === "EMPLOYEE") {
      if (!req.user.employeeId) {
        res.status(400);
        throw new Error("Your account is not linked to an employee profile");
      }

      const myLeavesPending = await Leave.countDocuments({
        employeeId: req.user.employeeId,
        status: "PENDING",
      });
      const myAttendanceToday = await Attendance.findOne({
        employeeId: req.user.employeeId,
        dateKey: todayKey,
      });
      const myAttendanceMonth = await Attendance.find({
        employeeId: req.user.employeeId,
        dateKey: { $regex: `^${monthKey}-` },
      }).select("totalMinutes");
      const minutes = myAttendanceMonth.reduce((acc, r) => acc + (r.totalMinutes || 0), 0);

      return res.json({
        role: "EMPLOYEE",
        todayKey,
        totalEmployees: null,
        leaveRequestsPending: myLeavesPending,
        attendance: {
          checkedIn: Boolean(myAttendanceToday && myAttendanceToday.checkInAt),
          checkedOut: Boolean(myAttendanceToday && myAttendanceToday.checkOutAt),
          monthTotalMinutes: minutes,
        },
      });
    }

    const totalEmployees = await Employee.countDocuments({ isActive: true });
    const leaveRequestsPending = await Leave.countDocuments({ status: "PENDING" });

    const presentToday = await Attendance.countDocuments({
      dateKey: todayKey,
      status: "PRESENT",
      checkInAt: { $ne: null },
    });

    res.json({
      role: req.user.role,
      todayKey,
      totalEmployees,
      leaveRequestsPending,
      attendance: { presentToday },
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { summary };

