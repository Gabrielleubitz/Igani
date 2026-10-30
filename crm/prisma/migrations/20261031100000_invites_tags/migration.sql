ALTER TABLE "AllowedUser" ADD COLUMN "inviteToken" TEXT,
ADD COLUMN "invitedAt" TIMESTAMP(3),
ADD COLUMN "inviteAcceptedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "AllowedUser_inviteToken_key" ON "AllowedUser"("inviteToken");

ALTER TABLE "Lead" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
