-- AlterEnum
ALTER TYPE "BookingSource" ADD VALUE 'TEAM_MEETING';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "attendees" JSONB;
