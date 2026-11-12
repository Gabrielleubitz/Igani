-- CreateTable
CREATE TABLE "MeetReaction" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetReaction_roomId_createdAt_idx" ON "MeetReaction"("roomId", "createdAt");

-- AddForeignKey
ALTER TABLE "MeetReaction" ADD CONSTRAINT "MeetReaction_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MeetRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
