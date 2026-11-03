-- New pipeline stage: the client signed the offer online (down-payment invoice still to send)
ALTER TYPE "LeadStatus" ADD VALUE 'SIGNED' BEFORE 'WON';

-- Audit entries for offers
ALTER TYPE "EntityType" ADD VALUE 'OFFER';

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'LIVE', 'SIGNED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "monthlyPrice" INTEGER,
    "timelineMonths" INTEGER,
    "modules" JSONB NOT NULL DEFAULT '[]',
    "contractUrl" TEXT,
    "contractPublicId" TEXT,
    "contractFileName" TEXT,
    "selectedModules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "signedAt" TIMESTAMP(3),
    "signerName" TEXT,
    "signerEmail" TEXT,
    "signerIp" TEXT,
    "signedTotal" INTEGER,
    "signedDocumentId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Offer_slug_key" ON "Offer"("slug");
CREATE INDEX "Offer_leadId_idx" ON "Offer"("leadId");
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
