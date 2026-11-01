-- The downpayment milestone was removed: one client payment makes the commission payable.
-- Cleanup only. The app works whether or not these columns still exist, but run this AFTER the new version is deployed
-- (the previous version still reads them).
ALTER TABLE "Lead"
  DROP COLUMN IF EXISTS "commissionDownpayment",
  DROP COLUMN IF EXISTS "commissionFinal",
  DROP COLUMN IF EXISTS "downpaymentReceivedAt",
  DROP COLUMN IF EXISTS "downpaymentPaidAt";
