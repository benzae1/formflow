CREATE TABLE "LoginRateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginRateLimitBucket_pkey" PRIMARY KEY ("key")
);

ALTER TABLE "Submission"
ADD COLUMN "retainUntil" TIMESTAMP(3),
ADD COLUMN "purgeAt" TIMESTAMP(3),
ADD COLUMN "deletedAt" TIMESTAMP(3);

ALTER TABLE "ApprovalTask"
ADD COLUMN "retainUntil" TIMESTAMP(3),
ADD COLUMN "purgeAt" TIMESTAMP(3);

ALTER TABLE "Notification"
ADD COLUMN "purgeAt" TIMESTAMP(3);

ALTER TABLE "AuditLog"
ADD COLUMN "retainUntil" TIMESTAMP(3),
ADD COLUMN "exportedForDsarAt" TIMESTAMP(3);

CREATE INDEX "LoginRateLimitBucket_resetAt_idx" ON "LoginRateLimitBucket"("resetAt");
CREATE INDEX "Submission_retainUntil_idx" ON "Submission"("retainUntil");
CREATE INDEX "Submission_purgeAt_idx" ON "Submission"("purgeAt");
CREATE INDEX "ApprovalTask_retainUntil_idx" ON "ApprovalTask"("retainUntil");
CREATE INDEX "ApprovalTask_purgeAt_idx" ON "ApprovalTask"("purgeAt");
CREATE INDEX "Notification_purgeAt_idx" ON "Notification"("purgeAt");
CREATE INDEX "AuditLog_retainUntil_idx" ON "AuditLog"("retainUntil");
