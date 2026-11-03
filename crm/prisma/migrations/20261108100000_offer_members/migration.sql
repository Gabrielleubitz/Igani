-- Teammates invited to an offer (salespeople see only offers they created or were invited to)
ALTER TABLE "Offer" ADD COLUMN "memberIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
