-- Phone-only leads (funnel forms that only ask for a phone number): email becomes optional.
-- The unique index stays; Postgres allows many NULLs under a unique index.
ALTER TABLE "Lead" ALTER COLUMN "email" DROP NOT NULL;

-- Where the lead came from, in more detail than "source" (page, form, campaign, referrer).
ALTER TABLE "Lead" ADD COLUMN "sourceDetail" TEXT;

-- Phone lookups for de-duplicating phone-only leads.
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");
