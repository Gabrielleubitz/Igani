-- Commission is earned on every client payment, not only on the final one. One row per payment.
CREATE TABLE "LeadPayment" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "commission" INTEGER NOT NULL,
    "commissionPaidAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LeadPayment_leadId_createdAt_idx" ON "LeadPayment"("leadId", "createdAt");

ALTER TABLE "LeadPayment" ADD CONSTRAINT "LeadPayment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep what was already recorded: each deal the client had paid in full becomes one full payment. Its commission is the deal's
-- commission without the bonus; the bonus stays on the deal (it was paid out together with the rest when finalPaidAt is set).
INSERT INTO "LeadPayment" ("id", "leadId", "amount", "receivedAt", "commission", "commissionPaidAt", "refundedAt", "createdAt")
SELECT
    'lp_' || l."id",
    l."id",
    COALESCE(l."quotedPrice", 0),
    l."finalPaymentReceivedAt",
    GREATEST(0, l."commissionTotal" - COALESCE(NULLIF(l."commissionSnapshot"->'breakdown'->>'bonusTotal', '')::numeric, 0)::int),
    l."finalPaidAt",
    l."refundedAt",
    l."finalPaymentReceivedAt"
FROM "Lead" l
WHERE l."finalPaymentReceivedAt" IS NOT NULL AND l."commissionTotal" IS NOT NULL;
