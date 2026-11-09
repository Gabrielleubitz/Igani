-- What calls taught us about a lead (AI): per call, and merged into a profile on the lead.
ALTER TABLE "Call" ADD COLUMN "intel" JSONB;
ALTER TABLE "Lead" ADD COLUMN "profile" JSONB;
