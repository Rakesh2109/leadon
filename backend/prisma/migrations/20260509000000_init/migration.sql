CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'LEADER', 'EMPLOYEE');
CREATE TYPE "TeamMemberRole" AS ENUM ('LEADER', 'MEMBER');
CREATE TYPE "CheckinStatus" AS ENUM ('DRAFT', 'SENT', 'RESPONDED', 'OVERDUE', 'CLOSED');
CREATE TYPE "Mood" AS ENUM ('GREAT', 'GOOD', 'OKAY', 'LOW', 'STUCK');
CREATE TYPE "MessageType" AS ENUM ('FEEDBACK', 'RECOGNITION', 'SUPPORT', 'GENERAL');
CREATE TYPE "LearningAssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');
CREATE TYPE "NotificationType" AS ENUM ('CHECKIN_REMINDER', 'NEW_MESSAGE', 'LEARNING_ASSIGNED', 'LEADER_NUDGE');
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'READ', 'FAILED');

CREATE TABLE "organizations" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "first_name" TEXT NOT NULL,
  "last_name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
  "organization_id" UUID,
  "firebase_token" TEXT,
  "last_login_at" TIMESTAMP(3),
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "teams" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "organization_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "leader_id" UUID,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "team_members" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "team_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "TeamMemberRole" NOT NULL DEFAULT 'MEMBER',
  "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hkm_stages" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "organization_id" UUID,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "position" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "hkm_stages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "checkin_templates" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "organization_id" UUID,
  "hkm_stage_id" UUID,
  "title" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "checkin_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "checkins" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "organization_id" UUID NOT NULL,
  "template_id" UUID,
  "hkm_stage_id" UUID,
  "leader_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "status" "CheckinStatus" NOT NULL DEFAULT 'SENT',
  "due_at" TIMESTAMP(3),
  "sent_at" TIMESTAMP(3),
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "checkins_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "checkin_responses" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "checkin_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "mood" "Mood",
  "response" TEXT NOT NULL,
  "needs_help" BOOLEAN NOT NULL DEFAULT false,
  "responded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "checkin_responses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "organization_id" UUID NOT NULL,
  "sender_id" UUID NOT NULL,
  "recipient_id" UUID NOT NULL,
  "body" TEXT NOT NULL,
  "type" "MessageType" NOT NULL DEFAULT 'GENERAL',
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "learning_items" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "organization_id" UUID,
  "hkm_stage_id" UUID,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "content_url" TEXT,
  "estimated_mins" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "learning_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "learning_assignments" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "learning_item_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "assigned_by" UUID NOT NULL,
  "status" "LearningAssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
  "reflection" TEXT,
  "due_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "learning_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_progress" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "organization_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "hkm_stage_id" UUID NOT NULL,
  "note" TEXT,
  "next_step" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employee_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "organization_id" UUID,
  "user_id" UUID NOT NULL,
  "type" "NotificationType" NOT NULL,
  "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "metadata" JSONB,
  "scheduled_for" TIMESTAMP(3),
  "sent_at" TIMESTAMP(3),
  "read_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");
CREATE UNIQUE INDEX "hkm_stages_organization_id_position_key" ON "hkm_stages"("organization_id", "position");
CREATE UNIQUE INDEX "checkin_responses_checkin_id_key" ON "checkin_responses"("checkin_id");

CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "teams_organization_id_idx" ON "teams"("organization_id");
CREATE INDEX "teams_leader_id_idx" ON "teams"("leader_id");
CREATE INDEX "teams_created_by_idx" ON "teams"("created_by");
CREATE INDEX "team_members_user_id_idx" ON "team_members"("user_id");
CREATE INDEX "hkm_stages_organization_id_idx" ON "hkm_stages"("organization_id");
CREATE INDEX "checkin_templates_organization_id_idx" ON "checkin_templates"("organization_id");
CREATE INDEX "checkin_templates_hkm_stage_id_idx" ON "checkin_templates"("hkm_stage_id");
CREATE INDEX "checkins_organization_id_idx" ON "checkins"("organization_id");
CREATE INDEX "checkins_leader_id_idx" ON "checkins"("leader_id");
CREATE INDEX "checkins_employee_id_idx" ON "checkins"("employee_id");
CREATE INDEX "checkins_status_idx" ON "checkins"("status");
CREATE INDEX "checkin_responses_employee_id_idx" ON "checkin_responses"("employee_id");
CREATE INDEX "messages_organization_id_idx" ON "messages"("organization_id");
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");
CREATE INDEX "messages_recipient_id_idx" ON "messages"("recipient_id");
CREATE INDEX "learning_items_organization_id_idx" ON "learning_items"("organization_id");
CREATE INDEX "learning_items_hkm_stage_id_idx" ON "learning_items"("hkm_stage_id");
CREATE INDEX "learning_assignments_learning_item_id_idx" ON "learning_assignments"("learning_item_id");
CREATE INDEX "learning_assignments_employee_id_idx" ON "learning_assignments"("employee_id");
CREATE INDEX "learning_assignments_assigned_by_idx" ON "learning_assignments"("assigned_by");
CREATE INDEX "employee_progress_organization_id_idx" ON "employee_progress"("organization_id");
CREATE INDEX "employee_progress_employee_id_idx" ON "employee_progress"("employee_id");
CREATE INDEX "employee_progress_hkm_stage_id_idx" ON "employee_progress"("hkm_stage_id");
CREATE INDEX "notifications_organization_id_idx" ON "notifications"("organization_id");
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "teams" ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hkm_stages" ADD CONSTRAINT "hkm_stages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "checkin_templates" ADD CONSTRAINT "checkin_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "checkin_templates" ADD CONSTRAINT "checkin_templates_hkm_stage_id_fkey" FOREIGN KEY ("hkm_stage_id") REFERENCES "hkm_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "checkin_templates" ADD CONSTRAINT "checkin_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "checkin_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_hkm_stage_id_fkey" FOREIGN KEY ("hkm_stage_id") REFERENCES "hkm_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_leader_id_fkey" FOREIGN KEY ("leader_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checkins" ADD CONSTRAINT "checkins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "checkin_responses" ADD CONSTRAINT "checkin_responses_checkin_id_fkey" FOREIGN KEY ("checkin_id") REFERENCES "checkins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checkin_responses" ADD CONSTRAINT "checkin_responses_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_hkm_stage_id_fkey" FOREIGN KEY ("hkm_stage_id") REFERENCES "hkm_stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "learning_items" ADD CONSTRAINT "learning_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "learning_assignments" ADD CONSTRAINT "learning_assignments_learning_item_id_fkey" FOREIGN KEY ("learning_item_id") REFERENCES "learning_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "learning_assignments" ADD CONSTRAINT "learning_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "learning_assignments" ADD CONSTRAINT "learning_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_progress" ADD CONSTRAINT "employee_progress_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_progress" ADD CONSTRAINT "employee_progress_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_progress" ADD CONSTRAINT "employee_progress_hkm_stage_id_fkey" FOREIGN KEY ("hkm_stage_id") REFERENCES "hkm_stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "employee_progress" ADD CONSTRAINT "employee_progress_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
