-- CreateTable
CREATE TABLE "CallShare" (
    "callId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sharedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallShare_pkey" PRIMARY KEY ("callId","userId")
);

-- CreateIndex
CREATE INDEX "CallShare_userId_idx" ON "CallShare"("userId");

-- AddForeignKey
ALTER TABLE "CallShare" ADD CONSTRAINT "CallShare_callId_fkey" FOREIGN KEY ("callId") REFERENCES "Call"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallShare" ADD CONSTRAINT "CallShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
