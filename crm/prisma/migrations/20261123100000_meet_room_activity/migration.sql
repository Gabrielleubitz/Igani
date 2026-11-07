-- Igani Meet rooms close on their own once nobody has been in them for a while
ALTER TABLE "MeetRoom" ADD COLUMN "lastActiveAt" TIMESTAMP(3);

-- Existing rooms: the last sign of life we have (people in the call, guests joining), or, for rooms more than
-- two hours old with no trace at all, when they were made. Open rooms past their time then close on next look.
UPDATE "MeetRoom" r SET "lastActiveAt" = COALESCE(
  (SELECT MAX(p."seenAt") FROM "MeetPresence" p WHERE p."roomId" = r."id"),
  (SELECT MAX(i."joinedAt") FROM "MeetInvite" i WHERE i."roomId" = r."id"),
  CASE WHEN r."createdAt" < NOW() - INTERVAL '2 hours' THEN r."createdAt" END
);
