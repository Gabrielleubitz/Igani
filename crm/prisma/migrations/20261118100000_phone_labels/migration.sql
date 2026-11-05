-- CreateTable
CREATE TABLE "PhoneLabel" (
    "number" TEXT NOT NULL,
    "company" TEXT,
    "category" TEXT,
    "address" TEXT,
    "website" TEXT,
    "placeId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'google',
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneLabel_pkey" PRIMARY KEY ("number")
);
