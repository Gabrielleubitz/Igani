-- Each saved signature belongs to an admin (their name and email come from their profile).
ALTER TABLE "Signature" ADD COLUMN "userId" TEXT;
ALTER TABLE "Signature" ADD CONSTRAINT "Signature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Signature_userId_idx" ON "Signature"("userId");

-- Signatures moved over from the admins' agreement signatures belong to that admin.
UPDATE "Signature" s SET "userId" = s."createdById"
WHERE s."userId" IS NULL AND s."createdById" IS NOT NULL AND EXISTS (SELECT 1 FROM "User" u WHERE u."id" = s."createdById");

-- The old company signature: the admin with that email, else that name.
UPDATE "Signature" s SET "userId" = u."id"
FROM "User" u
WHERE s."userId" IS NULL AND s."email" <> '' AND lower(u."email") = lower(s."email");
UPDATE "Signature" s SET "userId" = (SELECT u."id" FROM "User" u WHERE lower(trim(u."name")) = lower(trim(s."name")) LIMIT 1)
WHERE s."userId" IS NULL;
