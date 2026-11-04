-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('TO_CALL', 'CALLBACK', 'CONVERTED', 'NOT_INTERESTED', 'BAD_NUMBER');

-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "prospectId" TEXT;

-- CreateTable
CREATE TABLE "CallList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT,
    "query" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "placeId" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "address" TEXT,
    "category" TEXT,
    "rating" DOUBLE PRECISION,
    "reviews" INTEGER,
    "mapsUrl" TEXT,
    "status" "ProspectStatus" NOT NULL DEFAULT 'TO_CALL',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastCalledAt" TIMESTAMP(3),
    "lastOutcome" TEXT,
    "notes" TEXT,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallList_ownerId_createdAt_idx" ON "CallList"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "Prospect_listId_status_idx" ON "Prospect"("listId", "status");

-- CreateIndex
CREATE INDEX "Prospect_phone_idx" ON "Prospect"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_listId_placeId_key" ON "Prospect"("listId", "placeId");

-- CreateIndex
CREATE INDEX "Call_prospectId_idx" ON "Call"("prospectId");

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallList" ADD CONSTRAINT "CallList_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_listId_fkey" FOREIGN KEY ("listId") REFERENCES "CallList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

