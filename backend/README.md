# LeadOn Backend

Node.js, Express, Prisma, PostgreSQL, JWT, and bcrypt power the LeadOn API.

## Setup

1. Copy environment variables:

   ```bash
   cp backend/.env.example backend/.env
   ```

2. Start PostgreSQL from the repository root:

   ```bash
   docker compose up -d postgres
   ```

3. Install dependencies and run migrations:

   ```bash
   cd backend
   npm install
   npm run prisma:generate
   npm run prisma:migrate
   npm run dev
   ```

## Current API

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/users/me`

Private routes require an `Authorization: Bearer <token>` header.

## Notes

- Password hashes are never returned in API responses.
- Auth routes are rate limited.
- Public leader registration is blocked; leaders should be created by admin workflows in the next phase.
- Public admin registration requires `ADMIN_REGISTRATION_CODE` for initial setup.
