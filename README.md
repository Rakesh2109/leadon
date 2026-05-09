# LeadOn

**LeadOn** is an everyday leadership and growth platform designed to help leaders support employees through small, regular actions such as weekly check-ins, short feedback, microlearning, reminders, and HKM-based progress tracking.

The product is built around the **HKM growth cycle**:

> Understand → Build → Learn → Try → Choose → Move forward

LeadOn should feel simple, safe, and low-threshold—closer to a chat app with a clean dashboard than a heavy HR system.

---

## Product Goal

LeadOn helps managers and employees create continuous growth through:

- Weekly employee check-ins
- Short feedback and recognition
- Microlearning assignments
- HKM growth-stage tracking
- Simple team dashboard and engagement insights
- Admin tools for organizations, teams, content, and templates

---

## Main User Roles

### Leader / Manager
Leaders use LeadOn to follow up with employees, send check-ins, give feedback, assign learning, and track team progress.

### Employee
Employees use LeadOn to respond to check-ins, receive messages, complete microlearning, and view their own growth progress.

### Admin
Admins manage organizations, users, teams, HKM stages, check-in templates, learning content, and reports.

---

## Core MVP Features

### Authentication and User Management
- Register/login
- Role-based access: Admin, Leader, Employee
- Secure password handling
- Organization and team mapping
- Basic profile management

### Leader Dashboard
- Team overview
- Employee status
- Check-in completion
- Engagement score
- HKM stage progress
- Pending follow-up reminders
- Quick actions for check-ins, messages, and learning

### Weekly Check-ins
- Leader creates or selects a prompt
- Employee receives a simple check-in message
- Employee responds with text, mood, emoji, or status
- Reminder for missing responses
- Check-in history for both leader and employee

### Messaging and Feedback
- 1:1 leader-employee conversation
- Praise, recognition, coaching, or support messages
- Optional templates
- Conversation history
- Engagement logging

### Microlearning
- Short courses, documents, videos, or practical tasks
- Content tagged to HKM stages
- 3–5 minute learning experience
- Completion status
- Reflection capture

### HKM Growth Tracking
- Employee mapped to HKM stages
- Stage updates based on check-ins, learning, and reflection
- Leader can view progress by employee and team
- Historical progress view

### Notifications
- Push notifications for check-ins, messages, learning, and reminders
- Leader nudges for missing follow-ups
- Employee reminders for pending tasks

### Admin Portal
- Manage organizations, teams, leaders, and employees
- Manage check-in templates
- Manage learning content
- Configure HKM stages
- View usage reports

---

## Recommended Technology Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native |
| Web/Admin App | React.js + Tailwind CSS or Material UI |
| Backend API | Node.js + Express.js |
| Database | PostgreSQL |
| Authentication | JWT / OAuth 2.0 |
| Push Notifications | Firebase Cloud Messaging |
| File Storage | AWS S3 / Azure Blob / Google Cloud Storage |
| AI Suggestions | OpenAI API or rule-based prompt templates |
| DevOps | Docker + GitHub Actions |
| Analytics | Custom dashboard / Metabase |

---

## Suggested Repository Structure

```text
leadon/
├── apps/
│   ├── mobile/              # React Native app
│   └── web-admin/           # React admin dashboard
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── app.js
│   ├── prisma/ or migrations/
│   └── package.json
├── docs/
│   ├── PROJECT_OUTLINE.md
│   ├── API_SPEC.md
│   └── DATABASE_SCHEMA.md
├── AGENTS.md
├── README.md
└── docker-compose.yml
```

---

## MVP Development Phases

1. Discovery and product backlog
2. UX/UI design
3. Backend and database setup
4. Core modules: check-ins, messages, microlearning, HKM tracking
5. Admin portal and reports
6. Testing, UAT, deployment, and documentation

---

## First Development Target

Start with the backend foundation:

1. Create Node.js + Express backend
2. Connect PostgreSQL
3. Add authentication with JWT
4. Create role-based access control
5. Add models for users, organizations, teams, HKM stages, check-ins, messages, learning tasks, and notifications

## Current Backend Foundation

The first backend slice lives in `backend/` and includes:

- Express app setup with security middleware, JSON parsing, CORS, request logging, and health check
- Prisma PostgreSQL schema and initial migration for the MVP entities
- JWT authentication with bcrypt password hashing
- Zod request validation
- Authentication and role authorization middleware
- Rate limiting on auth routes

See `backend/README.md` for setup and local development commands.

## Current Frontend Foundation

The first frontend slice lives in `apps/`:

- `apps/web-admin` contains a Vite + React + Tailwind admin dashboard.
- `apps/mobile` contains an Expo + React Native mobile app skeleton.

Run the web admin:

```bash
cd apps/web-admin
npm install
npm run dev
```

Run the mobile app:

```bash
cd apps/mobile
npm install
npm run start
```

---

## License

Private project.
