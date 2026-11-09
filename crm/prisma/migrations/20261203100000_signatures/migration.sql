-- Saved signatures (Settings → Signatures), picked when signing sales contracts and offer contracts.
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- A copy of who signed for Igani when an offer's contract was approved.
ALTER TABLE "Offer" ADD COLUMN "contractSigner" JSONB;

-- Bring over the company signature from Settings (the default) ...
INSERT INTO "Signature" ("id", "label", "name", "title", "email", "phone", "image", "isDefault", "updatedAt")
SELECT 'sig_settings', COALESCE(NULLIF(signer.value->>'name', ''), 'Igani'), COALESCE(NULLIF(signer.value->>'name', ''), 'Igani'),
       COALESCE(signer.value->>'title', ''), COALESCE(signer.value->>'email', ''), COALESCE(signer.value->>'phone', ''),
       sig.value #>> '{}', true, CURRENT_TIMESTAMP
FROM "SiteSetting" sig
LEFT JOIN "SiteSetting" signer ON signer."key" = 'contract.signer'
WHERE sig."key" = 'contract.signature' AND COALESCE(sig.value #>> '{}', '') LIKE 'data:image/png;base64,%';

-- ... and each admin's saved signature for commission agreements.
INSERT INTO "Signature" ("id", "label", "name", "title", "image", "isDefault", "createdById", "updatedAt")
SELECT 'sig_' || cs."userId", cs."name", cs."name", cs."title", cs."signature",
       NOT EXISTS (SELECT 1 FROM "Signature" WHERE "isDefault"), cs."userId", CURRENT_TIMESTAMP
FROM "ContractSigner" cs
WHERE cs."signature" LIKE 'data:image/png;base64,%';

-- Offers already approved keep the signature they were approved with.
UPDATE "Offer" o SET "contractSigner" = jsonb_build_object('name', s."name", 'title', s."title", 'email', s."email", 'phone', s."phone", 'image', s."image")
FROM "Signature" s
WHERE s."isDefault" AND o."contractApprovedAt" IS NOT NULL AND o."contractSigner" IS NULL;
