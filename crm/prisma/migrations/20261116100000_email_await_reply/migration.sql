-- AlterTable
ALTER TABLE "EmailMessage" ADD COLUMN     "followUpAt" TIMESTAMP(3),
ADD COLUMN     "followUpTaskId" TEXT,
ADD COLUMN     "repliedAt" TIMESTAMP(3);

-- Find sent emails still waiting for an answer, per contact
CREATE INDEX "EmailMessage_leadId_direction_repliedAt_idx" ON "EmailMessage"("leadId", "direction", "repliedAt");
