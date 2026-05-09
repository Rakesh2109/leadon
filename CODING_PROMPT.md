# Coding Prompt for LeadOn

Use this prompt in Cursor, Claude Code, GitHub Copilot Workspace, or another coding agent.

---

You are a senior full-stack software engineer. Build an MVP for **LeadOn**, an everyday leadership and growth platform.

## Product Context

LeadOn helps leaders support employees through weekly check-ins, short messages, feedback, microlearning, reminders, and HKM growth-cycle tracking.

The HKM cycle is:

Understand → Build → Learn → Try → Choose → Move forward

The product should feel simple, safe, calm, and mobile-friendly. It should not feel like a heavy HR system.

## Tech Stack

Use this stack:

- Backend: Node.js + Express.js
- Database: PostgreSQL
- ORM: Prisma or Sequelize
- Auth: JWT + bcrypt
- Mobile app: React Native
- Web/admin app: React.js + Tailwind CSS
- Push notifications: Firebase Cloud Messaging
- File storage: prepare abstraction for S3/Azure/GCP, but simple local mock is fine for MVP
- DevOps: Docker + docker-compose
- Testing: Jest or Vitest

## Build the MVP in Phases

### Phase 1: Backend Foundation

Create the backend with:

- Express app
- Environment configuration
- PostgreSQL connection
- ORM setup
- Error handling middleware
- Request validation
- Authentication middleware
- Role-based access middleware
- Basic health route

Create these user roles:

- ADMIN
- LEADER
- EMPLOYEE

Create auth APIs:

- POST /api/auth/register
- POST /api/auth/login
- GET /api/users/me

Security requirements:

- Hash passwords
- Use JWT tokens
- Validate inputs
- Do not return password hashes
- Add basic rate limiting to auth routes

### Phase 2: Database Models

Create models/tables for:

- User
- Organization
- Team
- TeamMember
- HKMStage
- CheckinTemplate
- Checkin
- CheckinResponse
- Message
- LearningItem
- LearningAssignment
- EmployeeProgress
- Notification

Include UUID IDs and timestamps.

### Phase 3: Core APIs

Create REST APIs for:

#### Organizations and Teams
- Create organization
- Create team
- Add users to team
- Get leader’s team members

#### Check-ins
- Create check-in
- Send check-in to employee
- Employee responds to check-in
- Get check-in history
- Get pending check-ins

#### Messaging
- Send message
- Get conversation history
- Mark message as read

#### Microlearning
- Create learning item
- Assign learning item to employee
- Employee marks learning as complete
- Save employee reflection

#### HKM Tracking
- Get HKM stages
- Update employee HKM stage
- Get employee progress history
- Get suggested next step

#### Dashboard
- Leader dashboard summary
- Team engagement overview
- Check-in completion rate
- Learning completion rate
- Employee progress by HKM stage
- Pending follow-ups

#### Admin
- Manage users
- Manage teams
- Manage check-in templates
- Manage learning content
- Manage HKM stages
- View usage report

### Phase 4: Frontend MVP

Create simple screens.

#### Mobile App Screens
- Login
- Employee home
- Leader home
- Check-in list
- Respond to check-in
- Messages
- Microlearning list
- Learning detail
- HKM progress
- Profile

#### Web/Admin Screens
- Login
- Admin dashboard
- User management
- Team management
- Content management
- Check-in template management
- HKM stage settings
- Reports

### Phase 5: Notifications

Add notification service abstraction.

Prepare support for:

- Check-in reminders
- New message notification
- Learning assignment notification
- Leader follow-up nudge

For MVP, create notification records in database first. Add Firebase integration after core APIs work.

### Phase 6: Testing and Documentation

Add tests for:

- Auth
- Role permissions
- Check-in creation
- Check-in response
- Message sending
- Learning assignment
- Dashboard summary

Create documentation:

- README.md
- API_SPEC.md
- DATABASE_SCHEMA.md
- ENV_SETUP.md

## Important Coding Instructions

- Build step by step.
- Do not skip backend security.
- Keep code modular.
- Use clear names.
- Keep UI simple.
- Add comments only where useful.
- Do not create advanced AI features yet.
- Use rule-based suggestions first.
- Make the MVP easy to extend later.

## First Task

Start by creating the backend project structure with Express, PostgreSQL ORM setup, authentication, role-based middleware, and the first database schema migration.
