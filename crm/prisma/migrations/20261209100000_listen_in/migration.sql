-- Listening in on live calls: the media stream feeding the relay, and notes admins send the rep during a call.
ALTER TABLE "Call" ADD COLUMN "listenStreamSid" TEXT;

CREATE TABLE "CallNote" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CallNote_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CallNote_callId_createdAt_idx" ON "CallNote"("callId", "createdAt");
ALTER TABLE "CallNote" ADD CONSTRAINT "CallNote_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CallNote" ADD CONSTRAINT "CallNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
