-- Contracts built in the CRM (drafted with AI, edited and approved by an admin) and the signer's extra details
ALTER TABLE "Offer" ADD COLUMN "contractDoc" JSONB,
ADD COLUMN "contractLang" TEXT,
ADD COLUMN "contractApprovedAt" TIMESTAMP(3),
ADD COLUMN "contractApprovedById" TEXT,
ADD COLUMN "signerTitle" TEXT,
ADD COLUMN "signerPhone" TEXT;
