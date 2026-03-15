const dotenv = require("dotenv");
dotenv.config();

const { connectDb } = require("../config/db");
const { User } = require("../models/User");
const { Employee } = require("../models/Employee");
const { Attendance } = require("../models/Attendance");
const { Leave } = require("../models/Leave");
const { Payroll } = require("../models/Payroll");

function dateKey(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function monthKey(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

async function run() {
  await connectDb();

  await Promise.all([User.deleteMany({}), Employee.deleteMany({}), Attendance.deleteMany({}), Leave.deleteMany({}), Payroll.deleteMany({})]);

  const adminPasswordHash = await User.hashPassword("Admin@12345");
  const hrPasswordHash = await User.hashPassword("Hr@12345");
  const admin = await User.create({
    name: "System Admin",
    email: "admin@hrms.local",
    passwordHash: adminPasswordHash,
    role: "ADMIN",
  });
  const hrUser = await User.create({
    name: "HR Manager",
    email: "hr@hrms.local",
    passwordHash: hrPasswordHash,
    role: "HR",
  });

  const employees = await Employee.insertMany([
    {
      name: "Employee One",
      email: "employee1@hrms.local",
      phone: "+1 555-0101",
      department: "Engineering",
      position: "Software Engineer",
      joiningDate: new Date("2025-01-15"),
      salary: 6000,
    },
    {
      name: "Employee Two",
      email: "employee2@hrms.local",
      phone: "+1 555-0102",
      department: "HR",
      position: "HR Executive",
      joiningDate: new Date("2024-11-01"),
      salary: 4500,
    },
    {
      name: "Employee Three",
      email: "employee3@hrms.local",
      phone: "+1 555-0103",
      department: "Finance",
      position: "Accountant",
      joiningDate: new Date("2024-09-20"),
      salary: 5200,
    },
  ]);

  const employeePasswordHash = await User.hashPassword("Employee@12345");
  await User.insertMany(
    employees.map((e) => ({
      name: e.name,
      email: e.email,
      passwordHash: employeePasswordHash,
      role: "EMPLOYEE",
      employeeId: e._id,
    }))
  );

  const today = new Date();
  const d1 = new Date(today);
  d1.setDate(d1.getDate() - 1);
  const d2 = new Date(today);
  d2.setDate(d2.getDate() - 2);

  await Attendance.insertMany([
    {
      employeeId: employees[0]._id,
      dateKey: dateKey(d1),
      checkInAt: new Date(d1.setHours(9, 5, 0, 0)),
      checkOutAt: new Date(d1.setHours(17, 15, 0, 0)),
      totalMinutes: 490,
      status: "PRESENT",
    },
    {
      employeeId: employees[0]._id,
      dateKey: dateKey(d2),
      checkInAt: new Date(d2.setHours(9, 0, 0, 0)),
      checkOutAt: new Date(d2.setHours(18, 0, 0, 0)),
      totalMinutes: 540,
      status: "PRESENT",
    },
  ]);

  const leave = await Leave.create({
    employeeId: employees[0]._id,
    type: "ANNUAL",
    startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3),
    endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4),
    reason: "Family event",
    days: 2,
    status: "PENDING",
  });

  await Payroll.create({
    employeeId: employees[0]._id,
    monthKey: monthKey(today),
    baseSalary: employees[0].salary,
    unpaidLeaveDays: 0,
    deductions: 0,
    allowances: 0,
    netPay: employees[0].salary,
    generatedAt: new Date(),
    payslip: { employeeName: employees[0].name, department: employees[0].department, position: employees[0].position },
  });

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
  // eslint-disable-next-line no-console
  console.log("Admin:", admin.email, "password:", "Admin@12345");
  console.log("HR user:", hrUser.email, "password:", "Hr@12345");
  // eslint-disable-next-line no-console
  console.log("Employee:", employees[0].email, "password:", "Employee@12345");
  // eslint-disable-next-line no-console
  console.log("Pending leave id:", leave._id.toString());

  process.exit(0);
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

