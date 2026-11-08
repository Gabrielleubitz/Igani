-- Who found a lead themselves. Such a lead stays theirs (see the commission agreement, Section 1).
ALTER TABLE "Lead" ADD COLUMN "sourcedById" TEXT;

ALTER TABLE "Lead" ADD CONSTRAINT "Lead_sourcedById_fkey" FOREIGN KEY ("sourcedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Lead_sourcedById_idx" ON "Lead"("sourcedById");

-- Backfill: a lead created by a salesperson (their own call list, dial or added contact) was sourced by them.
UPDATE "Lead" l
SET "sourcedById" = a."actorId"
FROM "ActivityLog" a
JOIN "User" u ON u."id" = a."actorId"
WHERE a."entityType" = 'LEAD' AND a."entityId" = l."id" AND a."action" = 'lead.created' AND u."role" = 'SALES';
