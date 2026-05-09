# LeadOn Project Outline

## 1. Project Name

LeadOn – Everyday Leadership & Growth Platform

---

## 2. Product Summary

LeadOn is a lightweight leadership enablement platform that helps leaders support employees through weekly check-ins, short conversations, feedback, microlearning, and visible HKM growth-cycle tracking.

The platform should be simple, safe, mobile-friendly, and easy to use for busy managers and employees.

---

## 3. Problem Statement

Many leadership and employee development activities happen only during formal meetings, yearly reviews, or large HR programs. This makes development slow, infrequent, and disconnected from daily work.

LeadOn solves this by bringing leadership into small weekly moments.

---

## 4. Product Vision

LeadOn should become a simple daily/weekly leadership companion that helps organizations build better follow-up habits, stronger teams, and measurable employee growth.

---

## 5. HKM Growth Cycle

The product is based on the HKM method:

1. Understand
2. Build
3. Learn
4. Try
5. Choose
6. Move forward

Every check-in, learning task, reflection, and progress update should connect to one or more HKM stages.

---

## 6. User Roles

### Admin
Responsible for organization setup, users, teams, templates, HKM settings, learning content, and reports.

### Leader / Manager
Responsible for weekly follow-up, employee check-ins, feedback, recognition, microlearning assignments, and progress tracking.

### Employee
Responsible for responding to check-ins, completing learning, reflecting on progress, and viewing own growth journey.

---

## 7. MVP Scope

### Included in MVP
- Login and role-based access
- Organization/team structure
- Leader dashboard
- Employee dashboard
- Weekly check-ins
- Check-in reminders
- 1:1 messaging and feedback
- Microlearning assignment
- HKM stage tracking
- Push notifications
- Basic admin portal
- Basic reports and insights

### Not Included in MVP
- HRMS integration
- Calendar integration
- SSO/SAML
- Advanced AI coaching
- Sentiment analysis
- Enterprise billing
- Gamification
- Recognition wall

---

## 8. Key Modules

### Authentication Module
Handles user login, registration, JWT sessions, password hashing, and role permissions.

### Organization Module
Handles organizations, teams, employees, leaders, and admin mapping.

### Check-in Module
Handles check-in prompts, responses, mood/status, reminders, and history.

### Messaging Module
Handles short leader-employee conversations, feedback, recognition, and support messages.

### Microlearning Module
Handles content upload, assignment, completion, reflection, and HKM tagging.

### HKM Tracking Module
Handles employee stage mapping, progress history, and next-step suggestions.

### Notification Module
Handles push notifications and reminders.

### Dashboard Module
Handles team overview, engagement score, pending follow-ups, check-in completion, and progress insights.

### Admin Module
Handles content, users, teams, templates, HKM settings, and usage reports.

---

## 9. Suggested Database Entities

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
- audit_logs

---

## 10. API Groups

```text
/auth
/users
/organizations
/teams
/checkins
/messages
/learning
/hkm
/notifications
/dashboard
/admin
```

---

## 11. Acceptance Criteria

- Leaders can send weekly check-ins.
- Employees can respond easily.
- Leaders can send feedback and recognition.
- Leaders can assign microlearning content.
- Employees can complete learning tasks.
- HKM progress is visible to leaders and employees.
- Dashboard shows engagement, pending follow-ups, and progress.
- Push notifications work for core workflows.
- Admin can manage users, teams, content, and templates.
- Application can be deployed to staging/production.

---

## 12. Future Enhancements

- Advanced AI coaching assistant
- Sentiment analysis
- HRMS integration
- Calendar integration
- SSO/SAML
- Advanced analytics
- Enterprise billing
- Gamification
- Recognition wall
