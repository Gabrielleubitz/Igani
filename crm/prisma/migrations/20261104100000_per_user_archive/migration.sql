-- CreateTable
CREATE TABLE "LeadArchive" (
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadArchive_pkey" PRIMARY KEY ("leadId","userId")
);

-- CreateIndex
CREATE INDEX "LeadArchive_userId_idx" ON "LeadArchive"("userId");

-- AddForeignKey
ALTER TABLE "LeadArchive" ADD CONSTRAINT "LeadArchive_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadArchive" ADD CONSTRAINT "LeadArchive_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Leads archived before this change stay hidden for the person who archived them; the old global flag is cleared.
INSERT INTO "LeadArchive" ("leadId", "userId")
SELECT DISTINCT ON (a."entityId") a."entityId", a."actorId"
FROM "ActivityLog" a
JOIN "Lead" l ON l."id" = a."entityId"
JOIN "User" u ON u."id" = a."actorId"
WHERE a."action" = 'lead.archived' AND l."archived" = true AND a."actorId" IS NOT NULL
ORDER BY a."entityId", a."createdAt" DESC
ON CONFLICT DO NOTHING;
UPDATE "Lead" SET "archived" = false WHERE "archived" = true;
