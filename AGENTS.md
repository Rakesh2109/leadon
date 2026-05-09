# AGENTS.md

## Project Context

You are coding **LeadOn**, an everyday leadership and employee growth platform.

LeadOn helps leaders support employees through weekly check-ins, short feedback, microlearning, reminders, and HKM growth-cycle tracking.

The HKM cycle is:

> Understand → Build → Learn → Try → Choose → Move forward

The system must be simple, safe, calm, mobile-friendly, and suitable for real organizations.

---

## Main Goal

Build a production-ready MVP with:

- React Native mobile app for leaders and employees
- React web/admin dashboard
- Node.js + Express backend
- PostgreSQL database
- JWT authentication
- Role-based access control
- Firebase push notification support
- Clean API structure
- Clear documentation

---

## Coding Rules

1. Write clean, modular, production-ready code.
2. Use simple naming and clear folder structure.
3. Do not over-engineer the MVP.
4. Keep security in mind from the start.
5. Validate all user input.
6. Never expose passwords or tokens.
7. Use environment variables for secrets.
8. Use role-based access checks for Admin, Leader, and Employee.
9. Keep business logic inside services, not directly in routes.
10. Write code that is easy for another developer to continue.

---

## Preferred Backend Structure

```text
backend/src/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── validators/
├── utils/
└── app.js
```

---

## Preferred API Style

Use REST APIs.

Example:

```text
POST   /api/auth/register
POST   /api/auth/login
GET    /api/users/me
GET    /api/teams
POST   /api/checkins
GET    /api/checkins
POST   /api/checkins/:id/respond
POST   /api/messages
GET    /api/messages/:employeeId
POST   /api/learning
POST   /api/learning/:id/assign
GET    /api/dashboard/leader
GET    /api/admin/reports
```

---

## User Roles

### Admin
Can manage organizations, teams, users, templates, learning content, HKM stages, and reports.

### Leader
Can view assigned team members, send check-ins, send messages, assign learning, and view team progress.

### Employee
Can respond to check-ins, view messages, complete learning, and view own HKM progress.

---

## Database Guidance

Start with these tables:

- users
- organizations
- teams
- team_members
- hkm_stages
- checkin_templates
- checkins
- checkin_responses
- messages
- learning_items
- learning_assignments
- employee_progress
- notifications

Use PostgreSQL.

Use UUID primary keys where possible.

Include:

- created_at
- updated_at
- deleted_at where useful
- created_by where useful

---

## Security Requirements

- Passwords must be hashed using bcrypt or argon2.
- JWT tokens must expire.
- Add middleware for authentication.
- Add middleware for role permissions.
- Validate request body using Zod, Joi, or express-validator.
- Protect all private routes.
- Do not return sensitive user fields.
- Add basic rate limiting for auth routes.

---

## UI/UX Guidance

The UI should feel:

- Calm
- Simple
- Human
- Low-pressure
- Mobile-friendly
- Professional

Avoid heavy HR-system feeling.

Use clear language like:

- “How are things going this week?”
- “Send a check-in”
- “Follow up”
- “Assign learning”
- “Current growth stage”
- “Next small step”

---

## AI/Nudge Guidance

For MVP, AI suggestions can start as rule-based templates.

Examples:

- If employee did not respond, suggest: “Would you like to send a gentle reminder?”
- If mood is low, suggest: “Ask if they need support this week.”
- If learning is completed, suggest: “Send recognition or ask what they learned.”

Do not build advanced AI until the core MVP works.

---

## Testing Expectations

Write basic tests for:

- Authentication
- Role access
- Check-in creation
- Check-in response
- Message creation
- Learning assignment
- Dashboard summary

---

## Development Order

1. Backend project setup
2. Database schema
3. Authentication
4. Role-based access
5. Organization/team/user module
6. Check-in module
7. Messaging module
8. Microlearning module
9. HKM progress module
10. Notifications
11. Dashboard APIs
12. Admin portal APIs
13. Mobile screens
14. Web/admin screens
15. Testing and deployment

---

## Important Product Principle

LeadOn is not a complex HR system.  
It is a simple weekly leadership habit platform.

Always choose clarity over complexity.
