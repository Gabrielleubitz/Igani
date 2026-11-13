-- CreateTable
CREATE TABLE "IgThread" (
    "id" TEXT NOT NULL,
    "igsid" TEXT NOT NULL,
    "username" TEXT,
    "name" TEXT,
    "picture" TEXT,
    "leadId" TEXT,
    "reelId" TEXT,
    "keyword" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastInboundAt" TIMESTAMP(3),
    "unread" INTEGER NOT NULL DEFAULT 0,
    "draft" TEXT,
    "draftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IgThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IgMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "mid" TEXT,
    "fromUs" BOOLEAN NOT NULL,
    "text" TEXT NOT NULL,
    "sentById" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IgMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IgThread_igsid_key" ON "IgThread"("igsid");
CREATE UNIQUE INDEX "IgThread_leadId_key" ON "IgThread"("leadId");
CREATE INDEX "IgThread_lastMessageAt_idx" ON "IgThread"("lastMessageAt");
CREATE INDEX "IgThread_reelId_idx" ON "IgThread"("reelId");
CREATE UNIQUE INDEX "IgMessage_mid_key" ON "IgMessage"("mid");
CREATE INDEX "IgMessage_threadId_at_idx" ON "IgMessage"("threadId", "at");

-- AddForeignKey
ALTER TABLE "IgThread" ADD CONSTRAINT "IgThread_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IgMessage" ADD CONSTRAINT "IgMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "IgThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
