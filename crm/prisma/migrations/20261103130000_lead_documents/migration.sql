-- CreateTable
CREATE TABLE "LeadDocument" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadDocument_leadId_createdAt_idx" ON "LeadDocument"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "LeadDocument" ADD CONSTRAINT "LeadDocument_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
