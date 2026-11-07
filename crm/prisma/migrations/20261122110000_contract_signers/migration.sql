-- Per-admin signatures for commission agreements.
CREATE TABLE "ContractSigner" (
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "signature" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractSigner_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "ContractSigner" ADD CONSTRAINT "ContractSigner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
