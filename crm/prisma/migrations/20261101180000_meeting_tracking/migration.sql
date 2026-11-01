-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'NOT_HELD');

-- CreateEnum
CREATE TYPE "NotesStatus" AS ENUM ('WAITING', 'READY', 'LINK_ONLY', 'NONE', 'NOT_AVAILABLE');

-- CreateTable
CREATE TABLE "MeetingSession" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "meetingCode" TEXT NOT NULL,
    "conferenceRecord" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "participants" JSONB,
    "notesStatus" "NotesStatus",
    "notesSource" TEXT,
    "docId" TEXT,
    "docUrl" TEXT,
    "docTitle" TEXT,
    "summaryText" TEXT,
    "nextStepsText" TEXT,
    "fullText" TEXT,
    "notesAttempts" INTEGER NOT NULL DEFAULT 0,
    "nextCheckAt" TIMESTAMP(3),
    "notesFetchedAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MeetingSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetingSession_bookingId_key" ON "MeetingSession"("bookingId");

-- CreateIndex
CREATE INDEX "MeetingSession_status_idx" ON "MeetingSession"("status");

-- CreateIndex
CREATE INDEX "MeetingSession_notesStatus_nextCheckAt_idx" ON "MeetingSession"("notesStatus", "nextCheckAt");

-- AddForeignKey
ALTER TABLE "MeetingSession" ADD CONSTRAINT "MeetingSession_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
