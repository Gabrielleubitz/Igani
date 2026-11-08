-- A payment can be marked as the final one: the client has paid the whole price, even if payments in another currency
-- add up to slightly more or less than the shekel price that was locked when the client signed.
ALTER TABLE "LeadPayment" ADD COLUMN "isFinal" BOOLEAN NOT NULL DEFAULT false;
