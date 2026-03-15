# HR Management System (HRMS)

Full-stack HRMS web app with:
- Node.js + Express REST API (MVC)
- MongoDB (Mongoose)
- JWT authentication + role-based access (Admin/HR vs Employee)
- Vanilla HTML/CSS/JS frontend

## Folder structure

```
HR-management-system/
  client/                 # Frontend (static)
  server/                 # Backend (Express API)
  README.md
```

## Tech
- **Backend**: Express, Mongoose, JWT, bcrypt
- **Database**: MongoDB
- **Frontend**: HTML, CSS, JavaScript (no framework)

## Database schema (collections)
- `users`: auth + roles
- `employees`: employee profile/details
- `attendances`: daily check-in/out records
- `leaves`: leave requests + approvals + balance tracking
- `payrolls`: salary records + generated payslips (data)

See `server/src/models/` for full schema definitions.

## Quick start

### 1) Backend

```bash
cd server
npm install
```

Create `server/.env`:

```bash
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/hrms
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://127.0.0.1:5173
```

Seed sample data (creates Admin/HR user + employees + example attendance/leaves/payroll):

```bash
npm run seed
```

Run API:

```bash
npm run dev
```

API will be at `http://127.0.0.1:5000`.

### 2) Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open the URL shown by the dev server (usually `http://127.0.0.1:5173`).

### Sample logins

After seeding:
- **Admin**
  - Email: `admin@hrms.local`
  - Password: `Admin@12345`
- **HR Manager**
  - Email: `hr@hrms.local`
  - Password: `Hr@12345`
- **Employee**
  - Email: `employee1@hrms.local`
  - Password: `Employee@12345`

## Notes
- Employees can check-in/out and apply for leave; HR/Admin can manage employees, approve/reject leaves, generate payroll, and download PDF payslips.
- A simple password reset flow is provided via `/forgot` and `/reset` pages (token is shown directly for demo purposes).
- JWT is stored in browser `localStorage` for simplicity.
