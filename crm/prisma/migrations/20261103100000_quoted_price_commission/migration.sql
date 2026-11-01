-- CreateEnum
CREATE TYPE "LeadSourceType" AS ENUM ('COLD_CALL', 'ADS', 'OTHER');

-- AlterTable: Lead
ALTER TABLE "Lead"
  ADD COLUMN "quotedPrice" INTEGER,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'ILS',
  ADD COLUMN "sourceType" "LeadSourceType" NOT NULL DEFAULT 'OTHER',
  ADD COLUMN "commissionOverrides" JSONB,
  ADD COLUMN "commissionSnapshot" JSONB,
  ADD COLUMN "commissionTotal" INTEGER,
  ADD COLUMN "commissionDownpayment" INTEGER,
  ADD COLUMN "commissionFinal" INTEGER,
  ADD COLUMN "downpaymentReceivedAt" TIMESTAMP(3),
  ADD COLUMN "finalPaymentReceivedAt" TIMESTAMP(3),
  ADD COLUMN "downpaymentPaidAt" TIMESTAMP(3),
  ADD COLUMN "finalPaidAt" TIMESTAMP(3);

-- AlterTable: AllowedUser
ALTER TABLE "AllowedUser" ADD COLUMN "commissionTerms" JSONB;

-- Existing deal values become the quoted price (the old column is left in place, unused)
UPDATE "Lead" SET "quotedPrice" = "dealValue" WHERE "dealValue" IS NOT NULL;
