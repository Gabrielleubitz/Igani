-- Commission agreement: costs excluded from the base, refunds (clawback), termination date, stored signed agreements.
ALTER TABLE "Lead" ADD COLUMN "excludedCosts" INTEGER;
ALTER TABLE "Lead" ADD COLUMN "refundedAt" TIMESTAMP(3);
ALTER TABLE "AllowedUser" ADD COLUMN "terminatedAt" TIMESTAMP(3);

CREATE TABLE "AgreementAcceptance" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "terms" JSONB NOT NULL,
    "signerName" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "pdf" BYTEA NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgreementAcceptance_email_signedAt_idx" ON "AgreementAcceptance"("email", "signedAt");
