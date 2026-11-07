-- CreateTable
CREATE TABLE "MeetRecording" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "startedAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "sourceUrl" TEXT,
    "sourceUntil" TIMESTAMP(3),
    "publicId" TEXT,
    "bytes" INTEGER,
    "error" TEXT,
    "participants" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetRecording_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetRecording_sessionId_key" ON "MeetRecording"("sessionId");

-- CreateIndex
CREATE INDEX "MeetRecording_roomId_createdAt_idx" ON "MeetRecording"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "MeetRecording" ADD CONSTRAINT "MeetRecording_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MeetRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "MeetPresence" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetPresence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetPresence_roomId_key_key" ON "MeetPresence"("roomId", "key");

-- CreateIndex
CREATE INDEX "MeetPresence_roomId_seenAt_idx" ON "MeetPresence"("roomId", "seenAt");

-- AddForeignKey
ALTER TABLE "MeetPresence" ADD CONSTRAINT "MeetPresence_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MeetRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
