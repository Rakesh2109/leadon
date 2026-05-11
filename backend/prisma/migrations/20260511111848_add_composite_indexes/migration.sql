-- CreateIndex
CREATE INDEX "checkins_organization_id_status_deleted_at_idx" ON "checkins"("organization_id", "status", "deleted_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_status_idx" ON "notifications"("user_id", "status");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_revoked_at_idx" ON "refresh_tokens"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "teams_organization_id_deleted_at_idx" ON "teams"("organization_id", "deleted_at");

-- CreateIndex
CREATE INDEX "users_organization_id_deleted_at_idx" ON "users"("organization_id", "deleted_at");
