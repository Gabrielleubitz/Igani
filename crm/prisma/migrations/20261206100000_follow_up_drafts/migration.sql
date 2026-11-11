-- CreateTable
CREATE TABLE "FollowUpDraft" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "FollowUpDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUpDraft_userId_status_idx" ON "FollowUpDraft"("userId", "status");

-- CreateIndex
CREATE INDEX "FollowUpDraft_leadId_createdAt_idx" ON "FollowUpDraft"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "FollowUpDraft" ADD CONSTRAINT "FollowUpDraft_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpDraft" ADD CONSTRAINT "FollowUpDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
