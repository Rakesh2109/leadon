-- CreateEnum
CREATE TYPE "BoostCategory" AS ENUM ('PRESENCE', 'COLLABORATION', 'INITIATIVE', 'GROWTH');

-- CreateEnum
CREATE TYPE "AnonymousMessageStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED');

-- CreateTable
CREATE TABLE "boosts" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "recipient_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "category" "BoostCategory" NOT NULL DEFAULT 'GROWTH',
    "category_label" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "boosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_focuses" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "team_id" UUID,
    "employee_id" UUID NOT NULL,
    "topic" TEXT NOT NULL,
    "description" TEXT,
    "hidden_from_leader" BOOLEAN NOT NULL DEFAULT false,
    "week_start" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_focuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anonymous_messages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "team_id" UUID,
    "body" TEXT NOT NULL,
    "status" "AnonymousMessageStatus" NOT NULL DEFAULT 'UNREAD',
    "leader_note" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anonymous_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "boosts_organization_id_idx" ON "boosts"("organization_id");

-- CreateIndex
CREATE INDEX "boosts_sender_id_idx" ON "boosts"("sender_id");

-- CreateIndex
CREATE INDEX "boosts_recipient_id_idx" ON "boosts"("recipient_id");

-- CreateIndex
CREATE INDEX "boosts_recipient_id_deleted_at_idx" ON "boosts"("recipient_id", "deleted_at");

-- CreateIndex
CREATE INDEX "weekly_focuses_organization_id_idx" ON "weekly_focuses"("organization_id");

-- CreateIndex
CREATE INDEX "weekly_focuses_employee_id_idx" ON "weekly_focuses"("employee_id");

-- CreateIndex
CREATE INDEX "weekly_focuses_team_id_idx" ON "weekly_focuses"("team_id");

-- CreateIndex
CREATE INDEX "anonymous_messages_organization_id_idx" ON "anonymous_messages"("organization_id");

-- CreateIndex
CREATE INDEX "anonymous_messages_team_id_idx" ON "anonymous_messages"("team_id");

-- CreateIndex
CREATE INDEX "anonymous_messages_status_idx" ON "anonymous_messages"("status");

-- AddForeignKey
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boosts" ADD CONSTRAINT "boosts_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_focuses" ADD CONSTRAINT "weekly_focuses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_focuses" ADD CONSTRAINT "weekly_focuses_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_focuses" ADD CONSTRAINT "weekly_focuses_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_messages" ADD CONSTRAINT "anonymous_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anonymous_messages" ADD CONSTRAINT "anonymous_messages_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
