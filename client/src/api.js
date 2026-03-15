export const API_BASE = import.meta.env.VITE_API_BASE || "https://hrms-tt25.onrender.com";

function getToken() {
  return localStorage.getItem("hrms_token");
}

function setToken(token) {
  if (!token) localStorage.removeItem("hrms_token");
  else localStorage.setItem("hrms_token", token);
}

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data && data.message ? data.message : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const Auth = {
  getToken,
  setToken,
  async login(email, password) {
    const data = await api("/api/auth/login", { method: "POST", body: { email, password }, auth: false });
    setToken(data.token);
    localStorage.setItem("hrms_user", JSON.stringify(data.user));
    return data.user;
  },
  async register(name, email, password) {
    const data = await api("/api/auth/register", { method: "POST", body: { name, email, password }, auth: false });
    setToken(data.token);
    localStorage.setItem("hrms_user", JSON.stringify(data.user));
    return data.user;
  },
  async me() {
    return api("/api/auth/me");
  },
  async forgotPassword(email) {
    return api("/api/auth/forgot-password", { method: "POST", body: { email }, auth: false });
  },
  async resetPassword(token, password) {
    const data = await api("/api/auth/reset-password", { method: "POST", body: { token, password }, auth: false });
    setToken(data.token);
    localStorage.setItem("hrms_user", JSON.stringify(data.user));
    return data.user;
  },
  logout() {
    setToken(null);
    localStorage.removeItem("hrms_user");
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem("hrms_user") || "null");
    } catch {
      return null;
    }
  },
};

export const HRMS = {
  dashboard() {
    return api("/api/dashboard/summary");
  },
  employeesList(params = {}) {
    const sp = new URLSearchParams();
    if (params.q) sp.set("q", params.q);
    if (params.department) sp.set("department", params.department);
    if (params.position) sp.set("position", params.position);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return api(`/api/employees${qs}`);
  },
  employeeCreate(payload) {
    return api("/api/employees", { method: "POST", body: payload });
  },
  employeeUpdate(id, payload) {
    return api(`/api/employees/${id}`, { method: "PUT", body: payload });
  },
  employeeDelete(id) {
    return api(`/api/employees/${id}`, { method: "DELETE" });
  },
  myEmployee() {
    return api("/api/employees/me");
  },
  attendanceCheckIn() {
    return api("/api/attendance/check-in", { method: "POST", body: {} });
  },
  attendanceCheckOut() {
    return api("/api/attendance/check-out", { method: "POST", body: {} });
  },
  attendanceDaily(date) {
    const qs = date ? `?date=${encodeURIComponent(date)}` : "";
    return api(`/api/attendance/daily${qs}`);
  },
  attendanceMonthly(month, employeeId) {
    const sp = new URLSearchParams();
    if (month) sp.set("month", month);
    if (employeeId) sp.set("employeeId", employeeId);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return api(`/api/attendance/monthly${qs}`);
  },
  leavesList(params = {}) {
    const sp = new URLSearchParams(params);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return api(`/api/leaves${qs}`);
  },
  leaveApply(payload) {
    return api("/api/leaves", { method: "POST", body: payload });
  },
  leaveDecide(id, status, decisionNote) {
    return api(`/api/leaves/${id}/status`, { method: "PATCH", body: { status, decisionNote } });
  },
  leaveBalance() {
    return api("/api/leaves/balance");
  },
  payrollList(params = {}) {
    const sp = new URLSearchParams(params);
    const qs = sp.toString() ? `?${sp.toString()}` : "";
    return api(`/api/payroll${qs}`);
  },
  payrollGenerate(employeeId, month) {
    return api(`/api/payroll/generate/${employeeId}`, { method: "POST", body: { month } });
  },
  payrollMe(month) {
    const qs = month ? `?month=${encodeURIComponent(month)}` : "";
    return api(`/api/payroll/me${qs}`);
  },
};

