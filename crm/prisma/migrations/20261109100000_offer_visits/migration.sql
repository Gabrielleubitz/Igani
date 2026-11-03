-- CreateTable
CREATE TABLE "OfferVisit" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "maxScrollPct" INTEGER NOT NULL DEFAULT 0,
    "device" TEXT NOT NULL,
    "viewportW" INTEGER NOT NULL,
    "viewportH" INTEGER NOT NULL,
    "lang" TEXT,
    "country" TEXT,
    "referrer" TEXT,
    "ipHash" TEXT NOT NULL,
    "sections" JSONB NOT NULL DEFAULT '{}',
    "clicks" JSONB NOT NULL DEFAULT '[]',
    "moves" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "OfferVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OfferVisit_key_key" ON "OfferVisit"("key");

-- CreateIndex
CREATE INDEX "OfferVisit_offerId_startedAt_idx" ON "OfferVisit"("offerId", "startedAt");

-- CreateIndex
CREATE INDEX "OfferVisit_ipHash_startedAt_idx" ON "OfferVisit"("ipHash", "startedAt");

-- AddForeignKey
ALTER TABLE "OfferVisit" ADD CONSTRAINT "OfferVisit_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

