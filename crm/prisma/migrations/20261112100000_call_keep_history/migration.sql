-- DropForeignKey
ALTER TABLE "Call" DROP CONSTRAINT "Call_userId_fkey";

-- AlterTable
ALTER TABLE "Call" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Call" ADD CONSTRAINT "Call_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

