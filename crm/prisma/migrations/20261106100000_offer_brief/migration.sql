-- Latest call-transcript analysis on an offer (feeds the exported BUILD.md)
ALTER TABLE "Offer" ADD COLUMN "brief" JSONB,
ADD COLUMN "briefAt" TIMESTAMP(3);
