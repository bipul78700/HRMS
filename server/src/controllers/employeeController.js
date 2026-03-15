const { validationResult } = require("express-validator");
const { Employee } = require("../models/Employee");
const { User } = require("../models/User");

function ensureValid(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    const err = new Error(first.msg);
    err.statusCode = 400;
    throw err;
  }
}

async function listEmployees(req, res, next) {
  try {
    const { q, department, position } = req.query;
    const filter = { isActive: true };

    if (department) filter.department = String(department);
    if (position) filter.position = String(position);

    let query = Employee.find(filter).sort({ createdAt: -1 });
    if (q) {
      query = Employee.find({ ...filter, $text: { $search: String(q) } }, { score: { $meta: "textScore" } })
        .sort({ score: { $meta: "textScore" } });
    }

    const employees = await query.limit(200);
    res.json({ employees });
  } catch (e) {
    next(e);
  }
}

async function getEmployee(req, res, next) {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }
    res.json({ employee });
  } catch (e) {
    next(e);
  }
}

async function getMyEmployee(req, res, next) {
  try {
    if (!req.user.employeeId) {
      res.status(404);
      throw new Error("No employee profile linked to this account");
    }
    const employee = await Employee.findById(req.user.employeeId);
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }
    res.json({ employee });
  } catch (e) {
    next(e);
  }
}

async function createEmployee(req, res, next) {
  try {
    ensureValid(req);
    const { name, email, phone, department, position, joiningDate, salary, createUserAccount } = req.body;

    const employee = await Employee.create({
      name,
      email: String(email).toLowerCase().trim(),
      phone,
      department,
      position,
      joiningDate,
      salary,
    });

    // Optionally create linked user account (employee login) with default password.
    let user = null;
    if (createUserAccount) {
      const existing = await User.findOne({ email: employee.email });
      if (!existing) {
        const passwordHash = await User.hashPassword("Employee@12345");
        user = await User.create({
          name: employee.name,
          email: employee.email,
          passwordHash,
          role: "EMPLOYEE",
          employeeId: employee._id,
        });
      }
    }

    res.status(201).json({ employee, userCreated: Boolean(user) });
  } catch (e) {
    next(e);
  }
}

async function updateEmployee(req, res, next) {
  try {
    ensureValid(req);
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }

    const fields = ["name", "email", "phone", "department", "position", "joiningDate", "salary", "isActive"];
    for (const f of fields) {
      if (typeof req.body[f] !== "undefined") employee[f] = req.body[f];
    }
    if (req.body.email) employee.email = String(req.body.email).toLowerCase().trim();

    await employee.save();

    // Keep linked user email/name in sync if any user references this employee.
    await User.updateMany(
      { employeeId: employee._id },
      { $set: { name: employee.name, email: employee.email } }
    );

    res.json({ employee });
  } catch (e) {
    next(e);
  }
}

async function deleteEmployee(req, res, next) {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      res.status(404);
      throw new Error("Employee not found");
    }

    employee.isActive = false;
    await employee.save();
    await User.updateMany({ employeeId: employee._id }, { $set: { isActive: false } });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

module.exports = {
  listEmployees,
  getEmployee,
  getMyEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};

