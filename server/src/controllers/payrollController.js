const PDFDocument = require("pdfkit");
const { Payroll } = require("../models/Payroll");
const { Employee } = require("../models/Employee");
const { Leave } = require("../models/Leave");

function monthKeyFromDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

async function generatePayroll(req, res, next) {
  try {
    const employeeId = req.params.employeeId;
    const monthKey = String(req.body.month || monthKeyFromDate(new Date()));
    if (!/^\d{4}-\d{2}$/.test(monthKey)) {
      res.status(400);
      throw new Error("Invalid month. Use YYYY-MM");
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }

    // Simple payroll: base salary minus unpaid leave days deduction (daily rate), plus allowances minus deductions.
    const baseSalary = employee.salary;
    const monthStart = new Date(`${monthKey}-01T00:00:00.000Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

    const unpaidLeaves = await Leave.find({
      employeeId: employee._id,
      status: "APPROVED",
      type: "UNPAID",
      startDate: { $lt: monthEnd },
      endDate: { $gte: monthStart },
    });
    const unpaidLeaveDays = unpaidLeaves.reduce((acc, l) => acc + (l.days || 0), 0);

    const dailyRate = baseSalary / 30;
    const deductions = Math.max(0, unpaidLeaveDays * dailyRate);
    const allowances = 0;
    const netPay = Math.max(0, Math.round((baseSalary - deductions + allowances) * 100) / 100);

    const payroll = await Payroll.findOneAndUpdate(
      { employeeId: employee._id, monthKey },
      {
        $set: {
          baseSalary,
          unpaidLeaveDays,
          deductions,
          allowances,
          netPay,
          generatedAt: new Date(),
          payslip: {
            employeeName: employee.name,
            department: employee.department,
            position: employee.position,
          },
        },
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ payroll });
  } catch (e) {
    next(e);
  }
}

async function listPayroll(req, res, next) {
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
    if (req.query.month) filter.monthKey = String(req.query.month);

    const payrolls = await Payroll.find(filter)
      .sort({ monthKey: -1, createdAt: -1 })
      .populate("employeeId", "name email department position");

    res.json({ payrolls });
  } catch (e) {
    next(e);
  }
}

async function getMyPayroll(req, res, next) {
  try {
    if (!req.user.employeeId) {
      res.status(400);
      throw new Error("Your account is not linked to an employee profile");
    }
    const monthKey = String(req.query.month || monthKeyFromDate(new Date()));
    const payroll = await Payroll.findOne({ employeeId: req.user.employeeId, monthKey }).populate(
      "employeeId",
      "name email department position"
    );
    if (!payroll) {
      res.status(404);
      throw new Error("Payslip not found for this month");
    }
    res.json({ payroll });
  } catch (e) {
    next(e);
  }
}

async function downloadPayslipPdf(req, res, next) {
  try {
    const id = req.params.id;
    const payroll = await Payroll.findById(id).populate("employeeId", "name email department position");
    if (!payroll) {
      res.status(404);
      throw new Error("Payslip not found");
    }

    const isOwner =
      req.user.role === "EMPLOYEE" &&
      req.user.employeeId &&
      String(payroll.employeeId?._id || payroll.employeeId) === String(req.user.employeeId);
    const isManager = req.user.role === "ADMIN" || req.user.role === "HR";

    if (!isOwner && !isManager) {
      res.status(403);
      throw new Error("Forbidden");
    }

    const name = payroll.payslip?.employeeName || payroll.employeeId?.name || "employee";
    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `payslip-${payroll.monthKey}-${safeName || "employee"}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);

    doc.fontSize(18).text("HRMS Payslip", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#555").text(`Month: ${payroll.monthKey}`, { align: "center" });
    doc.moveDown(1.5);

    doc.fillColor("#000").fontSize(12).text("Employee details", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11);
    doc.text(`Name: ${name}`);
    doc.text(`Department: ${payroll.payslip?.department || payroll.employeeId?.department || "-"}`);
    doc.text(`Position: ${payroll.payslip?.position || payroll.employeeId?.position || "-"}`);
    doc.moveDown(1);

    doc.fontSize(12).text("Salary breakdown", { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(11);
    doc.text(`Base salary: ${payroll.baseSalary.toFixed(2)}`);
    doc.text(`Unpaid leave days: ${payroll.unpaidLeaveDays || 0}`);
    doc.text(`Deductions: ${payroll.deductions.toFixed(2)}`);
    doc.text(`Allowances: ${payroll.allowances.toFixed(2)}`);
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Net pay: ${payroll.netPay.toFixed(2)}`, { underline: true });

    doc.moveDown(1.5);
    doc.fontSize(9).fillColor("#777").text("Generated by HRMS demo system", { align: "right" });

    doc.end();
  } catch (e) {
    // If headers already sent, just log; otherwise delegate to error handler
    if (res.headersSent) {
      // eslint-disable-next-line no-console
      console.error(e);
    } else {
      next(e);
    }
  }
}

module.exports = { generatePayroll, listPayroll, getMyPayroll, downloadPayslipPdf };

