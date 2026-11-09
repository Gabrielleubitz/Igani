-- Team chat: threads, files, faster syncing (updatedAt), muted channels, presence and typing.
ALTER TABLE "ChatMessage" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "ChatMessage" SET "updatedAt" = GREATEST("createdAt", COALESCE("editedAt", "createdAt"), COALESCE("deletedAt", "createdAt"));
ALTER TABLE "ChatMessage" ADD COLUMN "parentId" TEXT;
ALTER TABLE "ChatMessage" ADD COLUMN "replyCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ChatMessage" ADD COLUMN "lastReplyAt" TIMESTAMP(3);
ALTER TABLE "ChatMessage" ADD COLUMN "attachments" JSONB;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "ChatMessage_channelId_updatedAt_idx" ON "ChatMessage"("channelId", "updatedAt");
CREATE INDEX "ChatMessage_parentId_createdAt_idx" ON "ChatMessage"("parentId", "createdAt");

ALTER TABLE "ChatMember" ADD COLUMN "muted" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ChatPresence" (
    "userId" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "typingChannelId" TEXT,
    "typingThreadId" TEXT,
    "typingAt" TIMESTAMP(3),
    CONSTRAINT "ChatPresence_pkey" PRIMARY KEY ("userId")
);
ALTER TABLE "ChatPresence" ADD CONSTRAINT "ChatPresence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- #general is the whole team's: everyone already chatting joins it (new people join on their first visit)
INSERT INTO "ChatMember" ("channelId", "userId", "lastReadAt")
SELECT c."id", u."userId", CURRENT_TIMESTAMP
FROM "ChatChannel" c
CROSS JOIN (SELECT DISTINCT "userId" FROM "ChatMember") u
WHERE c."kind" = 'CHANNEL' AND c."name" = 'general' AND c."archivedAt" IS NULL
ON CONFLICT DO NOTHING;
