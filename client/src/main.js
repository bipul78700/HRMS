import "./styles.css";
import { Auth, HRMS, API_BASE } from "./api";
import { el, fmtDate, fmtMoney, toast, setActiveNav, escapeHtml } from "./ui";

const app = document.getElementById("app");

function navItem(href, label, pill = "") {
  return `<a data-nav href="${href}"><span>${label}</span>${pill ? `<span class="pill">${pill}</span>` : ""}</a>`;
}

function layout({ title, body, user }) {
  const isManager = user?.role === "ADMIN" || user?.role === "HR";
  const sidebar = el(`
    <aside class="card sidebar">
      <div class="brand">
        <div class="logo">H</div>
        <div class="meta">
          <div class="title">HRMS</div>
          <div class="sub">${escapeHtml(user?.name || "Guest")} • ${escapeHtml(user?.role || "")}</div>
        </div>
      </div>
      <nav class="nav">
        ${navItem("/", "Dashboard")}
        ${isManager ? navItem("/employees", "Employees") : navItem("/profile", "My Profile")}
        ${navItem("/attendance", "Attendance")}
        ${navItem("/leaves", "Leaves")}
        ${navItem("/payroll", "Payroll")}
      </nav>
      <div style="margin-top:12px; display:flex; gap:10px;">
        <button class="btn danger" id="logoutBtn" style="width:100%;">Logout</button>
      </div>
    </aside>
  `);

  const content = el(`
    <main class="card content">
      <div class="topbar">
        <h1>${escapeHtml(title)}</h1>
        <div class="right">
          <span class="pill">${escapeHtml(user?.email || "")}</span>
        </div>
      </div>
      <div id="view"></div>
    </main>
  `);

  const shell = el(`<div class="container shell"></div>`);
  shell.append(sidebar, content);

  sidebar.querySelector("#logoutBtn").addEventListener("click", () => {
    Auth.logout();
    navigate("/login");
  });

  return { shell, view: content.querySelector("#view") };
}

function authLayout({ title, body }) {
  const wrap = el(`
    <div class="container authWrap card">
      <div class="authGrid">
        <section class="hero card">
          <div style="padding:16px;">
            <h2>HR Management System</h2>
            <p>Secure HRMS demo app with employees, attendance, leaves, payroll, and a role-based dashboard.</p>
            <div class="creds">
              <div><strong>Seeded accounts</strong></div>
              <div class="muted" style="margin-top:6px;">
                Admin: <code>admin@hrms.local</code> / <code>Admin@12345</code><br/>
                Employee: <code>employee1@hrms.local</code> / <code>Employee@12345</code>
              </div>
            </div>
          </div>
        </section>
        <section class="card" style="padding:18px;">
          <div class="topbar" style="margin-bottom:10px;">
            <h1>${escapeHtml(title)}</h1>
            <div class="right"></div>
          </div>
          <div id="authView"></div>
        </section>
      </div>
    </div>
  `);
  wrap.querySelector("#authView").append(body);
  return wrap;
}

function requireAuth() {
  const token = Auth.getToken();
  if (!token) return null;
  return Auth.getUser();
}

function navigate(path) {
  history.pushState({}, "", path);
  render();
}

window.addEventListener("popstate", render);
document.addEventListener("click", (e) => {
  const a = e.target.closest("a");
  if (!a) return;
  const href = a.getAttribute("href");
  if (!href || !href.startsWith("/")) return;
  e.preventDefault();
  navigate(href);
});

async function render() {
  const path = location.pathname;
  const user = requireAuth();

  app.innerHTML = "";

  if (!user && path !== "/login" && path !== "/register" && path !== "/forgot" && path !== "/reset") {
    navigate("/login");
    return;
  }

  if (path === "/login") {
    app.append(renderLogin());
    return;
  }
  if (path === "/register") {
    app.append(renderRegister());
    return;
  }
  if (path === "/forgot") {
    app.append(renderForgot());
    return;
  }
  if (path === "/reset") {
    app.append(renderReset());
    return;
  }

  const { shell, view } = layout({
    title: "Loading…",
    body: el(`<div></div>`),
    user,
  });
  app.append(shell);
  setActiveNav(path);

  try {
    if (path === "/") {
      shell.querySelector("h1").textContent = "Dashboard";
      await renderDashboard(view, user);
      return;
    }
    if (path === "/employees") {
      if (user.role !== "ADMIN") return navigate("/");
      shell.querySelector("h1").textContent = "Employees";
      await renderEmployees(view);
      return;
    }
    if (path === "/profile") {
      shell.querySelector("h1").textContent = "My Profile";
      await renderMyProfile(view);
      return;
    }
    if (path === "/attendance") {
      shell.querySelector("h1").textContent = "Attendance";
      await renderAttendance(view, user);
      return;
    }
    if (path === "/leaves") {
      shell.querySelector("h1").textContent = "Leave Management";
      await renderLeaves(view, user);
      return;
    }
    if (path === "/payroll") {
      shell.querySelector("h1").textContent = "Payroll";
      await renderPayroll(view, user);
      return;
    }

    view.innerHTML = `<div class="notice error">Page not found.</div>`;
  } catch (e) {
    view.innerHTML = `<div class="notice error">${escapeHtml(e.message || "Something went wrong")}</div>`;
  }
}

function renderLogin() {
  const form = el(`
    <form class="form">
      <div class="field">
        <label>Email</label>
        <input name="email" type="email" required placeholder="you@company.com" />
      </div>
      <div class="field">
        <label>Password</label>
        <input name="password" type="password" required placeholder="••••••••" />
      </div>
      <div class="actions">
        <a class="btn" href="/register">Create account</a>
        <button class="btn primary" type="submit">Login</button>
      </div>
      <div class="muted" style="font-size:12px; margin-top:4px;">
        <a href="/forgot">Forgot password?</a>
      </div>
      <div id="msg"></div>
    </form>
  `);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    const msg = form.querySelector("#msg");
    msg.innerHTML = "";
    try {
      await Auth.login(email, password);
      navigate("/");
    } catch (err) {
      msg.append(el(`<div class="notice error">${escapeHtml(err.message)}</div>`));
    }
  });

  return authLayout({ title: "Login", body: form });
}

function renderRegister() {
  const form = el(`
    <form class="form">
      <div class="row">
        <div class="field">
          <label>Name</label>
          <input name="name" required placeholder="Full name" />
        </div>
        <div class="field">
          <label>Email</label>
          <input name="email" type="email" required placeholder="you@company.com" />
        </div>
      </div>
      <div class="field">
        <label>Password</label>
        <input name="password" type="password" minlength="6" required placeholder="Min 6 characters" />
      </div>
      <div class="actions">
        <a class="btn" href="/login">Back to login</a>
        <button class="btn primary" type="submit">Register</button>
      </div>
      <div id="msg"></div>
      <div class="notice">Public registration creates an Employee user account. HR/Admin can create full employee records inside the app.</div>
    </form>
  `);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get("name") || "");
    const email = String(fd.get("email") || "");
    const password = String(fd.get("password") || "");
    const msg = form.querySelector("#msg");
    msg.innerHTML = "";
    try {
      await Auth.register(name, email, password);
      navigate("/");
    } catch (err) {
      msg.append(el(`<div class="notice error">${escapeHtml(err.message)}</div>`));
    }
  });

  return authLayout({ title: "Register", body: form });
}

function renderForgot() {
  const form = el(`
    <form class="form">
      <div class="field">
        <label>Email</label>
        <input name="email" type="email" required placeholder="you@company.com" />
      </div>
      <div class="actions">
        <a class="btn" href="/login">Back to login</a>
        <button class="btn primary" type="submit">Send reset token</button>
      </div>
      <div id="msg"></div>
    </form>
  `);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const email = String(fd.get("email") || "");
    const msg = form.querySelector("#msg");
    msg.innerHTML = "";
    try {
      const res = await Auth.forgotPassword(email);
      msg.append(
        el(
          `<div class="notice ok">Reset token generated. For this demo, copy it and use it on the reset page:<br/><code>${escapeHtml(
            res.resetToken || ""
          )}</code></div>`
        )
      );
    } catch (err) {
      msg.append(el(`<div class="notice error">${escapeHtml(err.message)}</div>`));
    }
  });

  return authLayout({ title: "Forgot password", body: form });
}

function renderReset() {
  const form = el(`
    <form class="form">
      <div class="field">
        <label>Reset token</label>
        <input name="token" required placeholder="Paste reset token" />
      </div>
      <div class="field">
        <label>New password</label>
        <input name="password" type="password" minlength="6" required placeholder="New password" />
      </div>
      <div class="actions">
        <a class="btn" href="/login">Back to login</a>
        <button class="btn primary" type="submit">Update password</button>
      </div>
      <div id="msg"></div>
    </form>
  `);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const token = String(fd.get("token") || "");
    const password = String(fd.get("password") || "");
    const msg = form.querySelector("#msg");
    msg.innerHTML = "";
    try {
      await Auth.resetPassword(token, password);
      msg.append(el(`<div class="notice ok">Password updated. Redirecting…</div>`));
      setTimeout(() => navigate("/"), 800);
    } catch (err) {
      msg.append(el(`<div class="notice error">${escapeHtml(err.message)}</div>`));
    }
  });

  return authLayout({ title: "Reset password", body: form });
}

async function renderDashboard(root, user) {
  const box = el(`<div class="grid" style="gap:14px;"></div>`);
  root.append(box);

  const data = await HRMS.dashboard();
  const stats = el(`
    <div class="grid cols-3">
      <div class="stat">
        <div class="label">Role</div>
        <div class="value">${escapeHtml(data.role)}</div>
      </div>
      <div class="stat">
        <div class="label">${user.role === "EMPLOYEE" ? "Pending Leave Requests" : "Total Employees"}</div>
        <div class="value">${escapeHtml(String(user.role === "EMPLOYEE" ? data.leaveRequestsPending : data.totalEmployees))}</div>
      </div>
      <div class="stat">
        <div class="label">${user.role === "EMPLOYEE" ? "Attendance (Month minutes)" : "Leaves Pending (All)"}</div>
        <div class="value">${escapeHtml(String(user.role === "EMPLOYEE" ? data.attendance.monthTotalMinutes : data.leaveRequestsPending))}</div>
      </div>
    </div>
  `);
  box.append(stats);

  if (user.role === "EMPLOYEE") {
    box.append(
      el(
        `<div class="notice">Tip: use <strong>Attendance</strong> to check-in/out and <strong>Leaves</strong> to apply for leave. Your account must be linked to an employee profile for attendance/leave balance.</div>`
      )
    );
  } else {
    box.append(
      el(`<div class="notice">Tip: go to <strong>Employees</strong> to create employee records and (optionally) auto-create employee login accounts.</div>`)
    );
  }
}

async function renderEmployees(root) {
  const wrap = el(`<div class="grid"></div>`);
  root.append(wrap);

  const toolbar = el(`
    <div class="card" style="padding:14px;">
      <div class="row">
        <div class="field">
          <label>Search</label>
          <input id="q" placeholder="Name, email, department…" />
        </div>
        <div class="field">
          <label>Department</label>
          <input id="dept" placeholder="e.g. Engineering" />
        </div>
      </div>
      <div class="actions">
        <button class="btn" id="searchBtn">Search</button>
        <button class="btn primary" id="addBtn">Add Employee</button>
      </div>
      <div id="msg"></div>
    </div>
  `);
  wrap.append(toolbar);

  const tableHost = el(`<div class="card" style="padding:14px;"></div>`);
  wrap.append(tableHost);

  const modalHost = el(`<div></div>`);
  wrap.append(modalHost);

  async function load() {
    tableHost.innerHTML = `<div class="notice">Loading…</div>`;
    const q = toolbar.querySelector("#q").value.trim();
    const department = toolbar.querySelector("#dept").value.trim();
    const data = await HRMS.employeesList({ q: q || undefined, department: department || undefined });
    tableHost.innerHTML = "";

    const rows = data.employees
      .map(
        (e) => `
          <tr>
            <td>${escapeHtml(e.name)}</td>
            <td>${escapeHtml(e.email)}</td>
            <td>${escapeHtml(e.department)}</td>
            <td>${escapeHtml(e.position)}</td>
            <td>${escapeHtml(fmtDate(e.joiningDate))}</td>
            <td>${escapeHtml(fmtMoney(e.salary))}</td>
            <td style="white-space:nowrap;">
              <button class="btn" data-edit="${e._id}">Edit</button>
              <button class="btn danger" data-del="${e._id}">Delete</button>
            </td>
          </tr>
        `
      )
      .join("");

    tableHost.append(
      el(`
        <table class="table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Department</th><th>Position</th><th>Joined</th><th>Salary</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="7" class="muted">No employees found.</td></tr>`}</tbody>
        </table>
      `)
    );

    tableHost.querySelectorAll("[data-edit]").forEach((b) =>
      b.addEventListener("click", () => openForm(data.employees.find((x) => x._id === b.dataset.edit)))
    );
    tableHost.querySelectorAll("[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        if (!confirm("Delete employee? (This will deactivate the record)")) return;
        try {
          await HRMS.employeeDelete(b.dataset.del);
          toast(toolbar.querySelector("#msg"), "ok", "Employee deleted");
          await load();
        } catch (e) {
          toast(toolbar.querySelector("#msg"), "error", e.message);
        }
      })
    );
  }

  function openForm(employee) {
    const isEdit = Boolean(employee);
    modalHost.innerHTML = "";
    const form = el(`
      <div class="card" style="padding:14px; margin-top:12px;">
        <div class="topbar" style="margin-bottom:10px;">
          <h1 style="font-size:16px; margin:0;">${isEdit ? "Edit Employee" : "Add Employee"}</h1>
          <div class="right"><button class="btn" id="closeBtn">Close</button></div>
        </div>
        <form class="form">
          <div class="row">
            <div class="field">
              <label>Name</label>
              <input name="name" required value="${escapeHtml(employee?.name || "")}" />
            </div>
            <div class="field">
              <label>Email</label>
              <input name="email" type="email" required value="${escapeHtml(employee?.email || "")}" />
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>Phone</label>
              <input name="phone" value="${escapeHtml(employee?.phone || "")}" />
            </div>
            <div class="field">
              <label>Department</label>
              <input name="department" required value="${escapeHtml(employee?.department || "")}" />
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>Position</label>
              <input name="position" required value="${escapeHtml(employee?.position || "")}" />
            </div>
            <div class="field">
              <label>Joining date</label>
              <input name="joiningDate" type="date" required value="${escapeHtml(fmtDate(employee?.joiningDate) || "")}" />
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>Salary (monthly)</label>
              <input name="salary" type="number" step="0.01" required value="${escapeHtml(String(employee?.salary ?? ""))}" />
            </div>
            <div class="field" style="display:flex; align-items:flex-end; gap:10px;">
              <label style="display:flex; align-items:center; gap:10px; margin:0; color:var(--muted);">
                <input type="checkbox" name="createUserAccount" ${isEdit ? "disabled" : ""} />
                Auto-create login (default password: <code>Employee@12345</code>)
              </label>
            </div>
          </div>
          <div class="actions">
            <button class="btn primary" type="submit">${isEdit ? "Save" : "Create"}</button>
          </div>
          <div id="fmsg"></div>
        </form>
      </div>
    `);

    form.querySelector("#closeBtn").addEventListener("click", () => (modalHost.innerHTML = ""));
    form.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const msg = form.querySelector("#fmsg");
      msg.innerHTML = "";
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      payload.salary = Number(payload.salary);
      payload.joiningDate = payload.joiningDate;
      payload.createUserAccount = fd.get("createUserAccount") === "on";

      try {
        if (isEdit) {
          await HRMS.employeeUpdate(employee._id, payload);
          msg.append(el(`<div class="notice ok">Saved.</div>`));
        } else {
          await HRMS.employeeCreate(payload);
          msg.append(el(`<div class="notice ok">Created.</div>`));
        }
        await load();
      } catch (err) {
        msg.append(el(`<div class="notice error">${escapeHtml(err.message)}</div>`));
      }
    });

    modalHost.append(form);
  }

  toolbar.querySelector("#searchBtn").addEventListener("click", load);
  toolbar.querySelector("#addBtn").addEventListener("click", () => openForm(null));

  await load();
}

async function renderMyProfile(root) {
  const wrap = el(`<div class="grid"></div>`);
  root.append(wrap);
  try {
    const data = await HRMS.myEmployee();
    const e = data.employee;
    wrap.append(
      el(`
      <div class="card" style="padding:14px;">
        <div class="grid cols-3">
          <div class="stat"><div class="label">Name</div><div class="value" style="font-size:18px;">${escapeHtml(e.name)}</div></div>
          <div class="stat"><div class="label">Department</div><div class="value" style="font-size:18px;">${escapeHtml(e.department)}</div></div>
          <div class="stat"><div class="label">Position</div><div class="value" style="font-size:18px;">${escapeHtml(e.position)}</div></div>
        </div>
        <div class="notice" style="margin-top:12px;">Email: <strong>${escapeHtml(e.email)}</strong> • Joined: <strong>${escapeHtml(fmtDate(e.joiningDate))}</strong> • Salary: <strong>${escapeHtml(fmtMoney(e.salary))}</strong></div>
      </div>
    `)
    );
  } catch (e) {
    wrap.append(el(`<div class="notice error">${escapeHtml(e.message)}</div>`));
  }
}

async function renderAttendance(root, user) {
  const wrap = el(`<div class="grid"></div>`);
  root.append(wrap);

  const actions = el(`
    <div class="card" style="padding:14px;">
      <div class="actions" style="justify-content:flex-start;">
        <button class="btn good" id="inBtn">Check-in</button>
        <button class="btn" id="outBtn">Check-out</button>
      </div>
      <div class="notice" style="margin-top:10px;">Monthly report shows total minutes. HR/Admin can also query an employee by id from the API.</div>
      <div id="msg"></div>
    </div>
  `);
  wrap.append(actions);

  const report = el(`
    <div class="card" style="padding:14px;">
      <div class="row">
        <div class="field">
          <label>Month</label>
          <input id="month" type="month" />
        </div>
        <div class="field" style="display:flex; align-items:flex-end;">
          <button class="btn primary" id="loadBtn">Load monthly report</button>
        </div>
      </div>
      <div id="host"></div>
    </div>
  `);
  wrap.append(report);

  actions.querySelector("#inBtn").addEventListener("click", async () => {
    try {
      await HRMS.attendanceCheckIn();
      toast(actions.querySelector("#msg"), "ok", "Checked in");
    } catch (e) {
      toast(actions.querySelector("#msg"), "error", e.message);
    }
  });
  actions.querySelector("#outBtn").addEventListener("click", async () => {
    try {
      await HRMS.attendanceCheckOut();
      toast(actions.querySelector("#msg"), "ok", "Checked out");
    } catch (e) {
      toast(actions.querySelector("#msg"), "error", e.message);
    }
  });

  const monthInput = report.querySelector("#month");
  const now = new Date();
  monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  async function load() {
    const host = report.querySelector("#host");
    host.innerHTML = `<div class="notice">Loading…</div>`;
    const data = await HRMS.attendanceMonthly(monthInput.value);
    const rows = data.records
      .map(
        (r) => `
        <tr>
          <td>${escapeHtml(r.dateKey)}</td>
          <td>${escapeHtml(r.employeeId?.name || "")}</td>
          <td>${escapeHtml(r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : "")}</td>
          <td>${escapeHtml(r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString() : "")}</td>
          <td>${escapeHtml(String(r.totalMinutes || 0))}</td>
          <td>${escapeHtml(r.status)}</td>
        </tr>
      `
      )
      .join("");
    host.innerHTML = "";
    host.append(
      el(`
        <div class="notice">Month: <strong>${escapeHtml(data.monthKey)}</strong> • Total minutes: <strong>${escapeHtml(String(data.totalMinutes))}</strong></div>
      `)
    );
    host.append(
      el(`
        <table class="table" style="margin-top:10px;">
          <thead>
            <tr><th>Date</th><th>Employee</th><th>Check-in</th><th>Check-out</th><th>Minutes</th><th>Status</th></tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="6" class="muted">No records.</td></tr>`}</tbody>
        </table>
      `)
    );
  }

  report.querySelector("#loadBtn").addEventListener("click", load);
  await load();

  if (user.role !== "EMPLOYEE") {
    actions.querySelector("#inBtn").disabled = true;
    actions.querySelector("#outBtn").disabled = true;
    toast(actions.querySelector("#msg"), "ok", "Admin view: check-in/out disabled.");
  }
}

async function renderLeaves(root, user) {
  const wrap = el(`<div class="grid"></div>`);
  root.append(wrap);

  const top = el(`<div class="card" style="padding:14px;"></div>`);
  wrap.append(top);
  const msgHost = el(`<div id="msg"></div>`);

  if (user.role === "EMPLOYEE") {
    const form = el(`
      <div>
        <div class="topbar" style="margin-bottom:10px;">
          <h1 style="font-size:16px; margin:0;">Apply for leave</h1>
          <div class="right"></div>
        </div>
        <form class="form">
          <div class="row">
            <div class="field">
              <label>Type</label>
              <select name="type" required>
                <option value="ANNUAL">Annual</option>
                <option value="SICK">Sick</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </div>
            <div class="field">
              <label>Start</label>
              <input type="date" name="startDate" required />
            </div>
          </div>
          <div class="row">
            <div class="field">
              <label>End</label>
              <input type="date" name="endDate" required />
            </div>
            <div class="field">
              <label>Reason</label>
              <input name="reason" placeholder="Optional" />
            </div>
          </div>
          <div class="actions">
            <button class="btn primary" type="submit">Submit</button>
          </div>
          <div id="fmsg"></div>
        </form>
      </div>
    `);
    top.append(form);
    top.append(msgHost);

    form.querySelector("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = Object.fromEntries(fd.entries());
      const host = form.querySelector("#fmsg");
      host.innerHTML = "";
      try {
        await HRMS.leaveApply(payload);
        host.append(el(`<div class="notice ok">Leave request submitted.</div>`));
        await load();
      } catch (err) {
        host.append(el(`<div class="notice error">${escapeHtml(err.message)}</div>`));
      }
    });
  } else {
    top.append(el(`<div class="notice">Admin/HR view: approve or reject pending requests.</div>`));
    top.append(msgHost);
  }

  const listHost = el(`<div class="card" style="padding:14px;"></div>`);
  wrap.append(listHost);

  async function load() {
    listHost.innerHTML = `<div class="notice">Loading…</div>`;
    const data = await HRMS.leavesList({});
    const rows = data.leaves
      .map((l) => {
        const actions =
          (user.role === "ADMIN" || user.role === "HR") && l.status === "PENDING"
            ? `
              <button class="btn good" data-approve="${l._id}">Approve</button>
              <button class="btn danger" data-reject="${l._id}">Reject</button>
            `
            : "";
        return `
          <tr>
            <td>${escapeHtml(l.employeeId?.name || "")}</td>
            <td>${escapeHtml(l.type)}</td>
            <td>${escapeHtml(fmtDate(l.startDate))}</td>
            <td>${escapeHtml(fmtDate(l.endDate))}</td>
            <td>${escapeHtml(String(l.days || ""))}</td>
            <td>${escapeHtml(l.status)}</td>
            <td>${escapeHtml(l.decisionNote || "")}</td>
            <td style="white-space:nowrap;">${actions}</td>
          </tr>
        `;
      })
      .join("");

    listHost.innerHTML = "";
    listHost.append(
      el(`
        <table class="table">
          <thead>
            <tr>
              <th>Employee</th><th>Type</th><th>Start</th><th>End</th><th>Days</th><th>Status</th><th>Note</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="8" class="muted">No leave requests.</td></tr>`}</tbody>
        </table>
      `)
    );

    listHost.querySelectorAll("[data-approve]").forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          await HRMS.leaveDecide(b.dataset.approve, "APPROVED", "Approved");
          toast(msgHost, "ok", "Approved");
          await load();
        } catch (e) {
          toast(msgHost, "error", e.message);
        }
      })
    );
    listHost.querySelectorAll("[data-reject]").forEach((b) =>
      b.addEventListener("click", async () => {
        try {
          await HRMS.leaveDecide(b.dataset.reject, "REJECTED", "Rejected");
          toast(msgHost, "ok", "Rejected");
          await load();
        } catch (e) {
          toast(msgHost, "error", e.message);
        }
      })
    );

    if (user.role === "EMPLOYEE") {
      try {
        const bal = await HRMS.leaveBalance();
        wrap.prepend(
          el(
            `<div class="notice">Leave balance • Annual: <strong>${escapeHtml(String(bal.leaveBalance.annual))}</strong> • Sick: <strong>${escapeHtml(
              String(bal.leaveBalance.sick)
            )}</strong> • Unpaid: <strong>${escapeHtml(String(bal.leaveBalance.unpaid))}</strong></div>`
          )
        );
      } catch {
        // ignore
      }
    }
  }

  await load();
}

async function renderPayroll(root, user) {
  const wrap = el(`<div class="grid"></div>`);
  root.append(wrap);

  const top = el(`<div class="card" style="padding:14px;"></div>`);
  wrap.append(top);

  const msg = el(`<div id="msg"></div>`);
  top.append(msg);

  if (user.role === "ADMIN" || user.role === "HR") {
    const form = el(`
      <form class="form">
        <div class="row">
          <div class="field">
            <label>Employee</label>
            <select name="employeeId" required></select>
          </div>
          <div class="field">
            <label>Month</label>
            <input name="month" type="month" required />
          </div>
        </div>
        <div class="actions">
          <button class="btn primary" type="submit">Generate payroll</button>
        </div>
        <div id="fmsg"></div>
      </form>
    `);
    top.prepend(form);

    const empSel = form.querySelector('select[name="employeeId"]');
    const emps = await HRMS.employeesList({});
    empSel.innerHTML = emps.employees
      .map((e) => `<option value="${e._id}">${escapeHtml(e.name)} (${escapeHtml(e.department)})</option>`)
      .join("");
    const now = new Date();
    form.querySelector('input[name="month"]').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const host = form.querySelector("#fmsg");
      host.innerHTML = "";
      const fd = new FormData(form);
      try {
        await HRMS.payrollGenerate(String(fd.get("employeeId")), String(fd.get("month")));
        host.append(el(`<div class="notice ok">Payroll generated.</div>`));
        await load();
      } catch (err) {
        host.append(el(`<div class="notice error">${escapeHtml(err.message)}</div>`));
      }
    });
  } else {
    top.prepend(el(`<div class="notice">Employee view: your generated payslips appear below (by month).</div>`));
  }

  const listHost = el(`<div class="card" style="padding:14px;"></div>`);
  wrap.append(listHost);

  async function load() {
    listHost.innerHTML = `<div class="notice">Loading…</div>`;
    const data = await HRMS.payrollList({});
    const rows = data.payrolls
      .map(
        (p) => `
        <tr>
          <td>${escapeHtml(p.employeeId?.name || "")}</td>
          <td>${escapeHtml(p.monthKey)}</td>
          <td>${escapeHtml(fmtMoney(p.baseSalary))}</td>
          <td>${escapeHtml(String(p.unpaidLeaveDays || 0))}</td>
          <td>${escapeHtml(fmtMoney(p.deductions))}</td>
          <td>${escapeHtml(fmtMoney(p.netPay))}</td>
          <td><button class="btn" data-pdf="${p._id}">PDF</button></td>
        </tr>
      `
      )
      .join("");
    listHost.innerHTML = "";
    listHost.append(
      el(`
        <table class="table">
          <thead>
            <tr><th>Employee</th><th>Month</th><th>Base</th><th>Unpaid leave days</th><th>Deductions</th><th>Net pay</th><th>Payslip</th></tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="7" class="muted">No payroll records.</td></tr>`}</tbody>
        </table>
      `)
    );

    listHost.querySelectorAll("[data-pdf]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        try {
          const token = Auth.getToken();
          const res = await fetch(`${API_BASE}/api/payroll/${btn.dataset.pdf}/pdf`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || `Download failed (${res.status})`);
          }
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "payslip.pdf";
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        } catch (e) {
          toast(msg, "error", e.message || "Failed to download PDF");
        }
      })
    );
  }

  await load();
}

render();

