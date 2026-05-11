# LeadOn — Everyday Leadership & Growth Platform

LeadOn helps managers support employees through small, regular weekly actions: check-ins, feedback, microlearning, and HKM-based progress tracking. It feels closer to a chat app than a heavy HR system.


---

## HKM Growth Cycle

> Understand → Build → Learn → Try → Choose → Move forward

Every feature in LeadOn is anchored to this six-stage growth model. Employees move through stages based on check-ins, learning completions, and reflections logged by their leader.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Node.js + Express.js |
| Database | PostgreSQL (Neon.tech, serverless) |
| ORM | Prisma |
| Auth | JWT access tokens (15 min) + httpOnly refresh cookie (7 days) |
| Queue / Jobs | BullMQ + Redis |
| Push Notifications | Firebase Cloud Messaging (firebase-admin) |
| File Storage | Local disk (`/uploads`) via multer — swap for S3 in production |
| Web Admin | React + Vite + Tailwind CSS |
| Mobile App | Expo + React Native |
| Deployment | Hostinger VPS + GitHub Actions (auto-migrate on push) |

---

## Repository Structure

```
leadon/
├── apps/
│   ├── web-admin/          # React + Vite admin/leader/employee dashboard
│   └── mobile/             # Expo React Native mobile app
├── backend/
│   ├── prisma/             # Schema, migrations, seed
│   ├── public/             # Pre-built frontend (served by Express in production)
│   ├── uploads/            # Uploaded learning files (PDF, video, doc)
│   └── src/
│       ├── config/         # env, logger, prisma, redis
│       ├── controllers/    # Business logic for each resource
│       ├── middleware/     # auth, authorize, validate, sanitize, upload, auditLog
│       ├── queues/         # BullMQ notification + reminder workers
│       ├── routes/         # Express route files
│       ├── services/       # fcmService (Firebase push)
│       ├── utils/          # appError, userSerializer
│       └── validators/     # Zod schemas
├── docker-compose.yml
└── .github/workflows/      # CI: prisma migrate deploy on push to main
```

---

## Features

### Authentication & Users
- Register / login with bcrypt-hashed passwords
- JWT access token (in-memory on client, never localStorage) + httpOnly refresh cookie
- Silent token refresh — seamless session renewal
- Role-based access: **Admin**, **Leader**, **Employee**
- Logout single session or all sessions (refresh token revocation)

### Leader Dashboard
- Team metrics: total users, active teams, pending check-ins, unread notifications
- **Leader nudges** — rule-based suggestions based on current team state
- Employee HKM progress view with current stage and next-step advice
- Recent messages summary

### Weekly Check-ins
- Leader sends a check-in with a custom or **template-based** prompt
- Employee responds with **mood picker** (Great / Good / Okay / Low / Stuck), free text, and optional "needs help" flag
- Flagging needs-help auto-notifies the leader
- Check-in status lifecycle: Sent → Responded / Overdue
- **Auto-overdue job**: check-ins unanswered after 48 h are marked Overdue and employee is notified
- Full check-in history for both leader and employee

### Check-in Templates
- Admin/Leader creates reusable prompt templates
- Template library shown in send modal for one-click prefill
- Admin Settings page to manage templates

### Messaging & Feedback
- 1:1 messages between any two org members
- Types: General, Feedback, Recognition, Support
- **Auto-template prefill** when switching type (e.g. Recognition fills a praise starter)
- Read/unread status

### Microlearning
- Create learning items with title, description, estimated time, content URL or **uploaded file** (PDF, video, doc — up to 50 MB)
- Files stored in `/uploads`, served via Express static
- Content tagged to HKM stages
- Leader assigns items to employees
- Employee marks complete with an optional reflection note
- Completion shown in reports

### HKM Progress Tracking
- Leader records progress entries per employee with HKM stage, note, and next-step advice
- Employee sees their full progress history with next-step highlighted on dashboard
- Current stage highlighted in the HKM stage grid

### Notifications
- In-app notifications created automatically for: check-in received, message received, learning assigned, overdue check-in reminder, leader nudge
- **Firebase Cloud Messaging push** — fires when notification is processed (requires `FIREBASE_SERVICE_ACCOUNT` env var)
- Mark single / all notifications as read

### Automated Reminder Jobs (BullMQ)
- **Every 6 hours**: scans for SENT check-ins older than 48 h → marks Overdue + notifies employee
- **Every 24 hours**: scans for leaders with no check-in sent in 7 days → sends a nudge notification
- Both jobs degrade gracefully when Redis is unavailable

### Reports (Admin / Leader)
- Check-in response rate (progress bar)
- Learning completion rate (progress bar)
- HKM stage distribution chart
- Export all metrics as CSV

### Admin Portal
- Create organisations and users
- Manage teams and members
- Manage check-in templates
- View HKM stage list
- View audit logs

---

## Quick Start — Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL database (or a free [Neon](https://neon.tech) connection string)
- Redis (optional — queues degrade gracefully without it)

### 1. Clone

```bash
git clone https://github.com/reddy-png/LeadOn.git
cd LeadOn
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL, JWT_SECRET, etc.
npm install
npx prisma migrate deploy
npx prisma db seed
npm run dev                   # http://localhost:4000
```

### 3. Web Admin

```bash
cd apps/web-admin
npm install
npm run dev                   # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:4000`.

### 4. Mobile App

```bash
cd apps/mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `i` / `a` for iOS / Android simulator.

---

## Environment Variables

Create `backend/.env` with:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=15m
BCRYPT_SALT_ROUNDS=12
ADMIN_REGISTRATION_CODE=LeadOn-Admin-2024
CORS_ORIGIN=http://localhost:5173
REDIS_URL=redis://localhost:6379          # optional

# Firebase Cloud Messaging (optional — push notifications)
# Paste the full service account JSON as a single-line string
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
```

---

## Firebase Push Notifications Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → Create project
2. Project Settings → Service Accounts → **Generate new private key**
3. Copy the downloaded JSON and minify it to a single line
4. Set it as `FIREBASE_SERVICE_ACCOUNT` in your environment variables
5. The backend will automatically send push notifications when processing queued notifications for users with a registered device token

The mobile app registers the Expo push token automatically on login.

---

## Production Deployment (Hostinger VPS)

The backend serves the pre-built React frontend from `backend/public/`. To deploy:

1. Push to `main` — GitHub Actions runs `prisma migrate deploy` automatically
2. SSH into the server and run `git pull && npm install --production && pm2 restart leadon`

Or use the full build script:

```bash
cd backend
npm run build          # builds frontend into backend/public/
npm start
```

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@leadon.com | Admin@1234 |
| Leader | leader@leadon.com | Leader@1234 |
| Employee | employee@leadon.com | Employee@1234 |

---

## API Overview

All endpoints are under `/api/v1`.

| Resource | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all` |
| Users | `GET /users/me`, `PATCH /users/me`, `POST /users/fcm-token` |
| Organizations | `GET /organizations/me`, `PATCH /organizations/me`, `GET /organizations/me/users` |
| Teams | `GET/POST /teams`, `PATCH/DELETE /teams/:id`, `POST/DELETE /teams/:id/members` |
| Check-ins | `GET/POST /checkins`, `GET /checkins/:id`, `POST /checkins/:id/respond` |
| Templates | `GET/POST /checkins/templates`, `DELETE /checkins/templates/:id` |
| Messages | `GET/POST /messages`, `PATCH /messages/:id/read` |
| Learning | `GET/POST /learning`, `POST /learning/upload`, `POST /learning/:id/assign`, `PATCH /learning/assignments/:id/complete` |
| Progress | `GET /progress/dashboard`, `GET /progress/my-progress`, `GET /progress/hkm-stages`, `GET /progress/reports`, `POST /progress` |
| Notifications | `GET /notifications`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read` |
| Admin | `GET/POST /admin/organizations`, `POST/DELETE /admin/users`, `GET /admin/audit-logs` |

---

## License

Private project — Ops Analytics / LeadOn.
