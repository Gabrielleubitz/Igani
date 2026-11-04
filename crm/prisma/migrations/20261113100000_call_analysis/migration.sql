-- AlterTable
ALTER TABLE "Call" ADD COLUMN     "analysis" JSONB,
ADD COLUMN     "analysisAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "analysisError" TEXT,
ADD COLUMN     "analyzedAt" TIMESTAMP(3),
ADD COLUMN     "transcript" JSONB;

