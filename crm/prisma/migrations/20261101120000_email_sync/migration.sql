-- CreateEnum
CREATE TYPE "EmailDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "mailboxUserId" TEXT,
    "externalId" TEXT NOT NULL,
    "messageIdHeader" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "threadId" TEXT,
    "direction" "EmailDirection" NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "toEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ccEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailboxSync" (
    "userId" TEXT NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailboxSync_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "EmailMessage_leadId_sentAt_idx" ON "EmailMessage"("leadId", "sentAt");

-- CreateIndex
CREATE INDEX "EmailMessage_direction_readAt_idx" ON "EmailMessage"("direction", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_leadId_dedupeKey_key" ON "EmailMessage"("leadId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_mailboxUserId_fkey" FOREIGN KEY ("mailboxUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MailboxSync" ADD CONSTRAINT "MailboxSync_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

