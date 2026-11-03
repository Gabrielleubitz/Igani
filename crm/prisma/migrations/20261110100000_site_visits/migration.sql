-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
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
    "utmSource" TEXT,
    "utmCampaign" TEXT,
    "ipHash" TEXT NOT NULL,
    "sections" JSONB NOT NULL DEFAULT '{}',
    "clicks" JSONB NOT NULL DEFAULT '[]',
    "moves" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "SiteVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteVisit_key_key" ON "SiteVisit"("key");

-- CreateIndex
CREATE INDEX "SiteVisit_page_startedAt_idx" ON "SiteVisit"("page", "startedAt");

-- CreateIndex
CREATE INDEX "SiteVisit_ipHash_startedAt_idx" ON "SiteVisit"("ipHash", "startedAt");
