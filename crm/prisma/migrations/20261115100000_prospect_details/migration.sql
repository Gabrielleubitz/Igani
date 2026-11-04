-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN     "details" JSONB,
ADD COLUMN     "enrichStatus" TEXT,
ADD COLUMN     "enrichedAt" TIMESTAMP(3);
