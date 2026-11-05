-- CreateTable
CREATE TABLE "MeetRoom" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hostId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "durationMin" INTEGER NOT NULL DEFAULT 30,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeetInvite" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "userId" TEXT,
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "sendError" TEXT,
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MeetRoom_code_key" ON "MeetRoom"("code");

-- CreateIndex
CREATE INDEX "MeetRoom_hostId_createdAt_idx" ON "MeetRoom"("hostId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MeetInvite_token_key" ON "MeetInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "MeetInvite_roomId_email_key" ON "MeetInvite"("roomId", "email");

-- AddForeignKey
ALTER TABLE "MeetRoom" ADD CONSTRAINT "MeetRoom_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeetInvite" ADD CONSTRAINT "MeetInvite_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MeetRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

