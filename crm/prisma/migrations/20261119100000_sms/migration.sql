-- CreateEnum
CREATE TYPE "SmsDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateTable
CREATE TABLE "SmsMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "leadId" TEXT,
    "direction" "SmsDirection" NOT NULL,
    "lineNumber" TEXT NOT NULL,
    "otherNumber" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "media" INTEGER NOT NULL DEFAULT 0,
    "twilioSid" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SmsMessage_twilioSid_key" ON "SmsMessage"("twilioSid");

-- CreateIndex
CREATE INDEX "SmsMessage_userId_otherNumber_createdAt_idx" ON "SmsMessage"("userId", "otherNumber", "createdAt");

-- CreateIndex
CREATE INDEX "SmsMessage_userId_direction_readAt_idx" ON "SmsMessage"("userId", "direction", "readAt");

-- CreateIndex
CREATE INDEX "SmsMessage_leadId_createdAt_idx" ON "SmsMessage"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsMessage" ADD CONSTRAINT "SmsMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

