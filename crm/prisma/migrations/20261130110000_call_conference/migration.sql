-- Calls placed through a Twilio conference room, so admins can listen in (off until enabled in Settings).
ALTER TABLE "Call" ADD COLUMN "conference" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Call" ADD COLUMN "conferenceSid" TEXT;
