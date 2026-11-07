-- A teammate's confirmation, before each internal training video, that they will not download or share it.
CREATE TABLE "VideoAck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAck_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VideoAck_userId_videoId_createdAt_idx" ON "VideoAck"("userId", "videoId", "createdAt");

ALTER TABLE "VideoAck" ADD CONSTRAINT "VideoAck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
