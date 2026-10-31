# Plan: Meet call tracking + Gemini notes in the Igani CRM

Status: PROPOSAL for owner approval. Nothing has been built.
Scope: `crm/` (Next.js + Prisma + NextAuth Google sign-in, Gmail sync already live).

## 0. What exists today (read from the code)
- `Booking` (prisma) holds `meetUrl`, `googleEventId`, `startTime`/`endTime` (scheduled, not actual), `hostId`, `leadId`, `guestEmail`.
- `lib/calendar.ts` `createMeetEvent` makes the Calendar event with a Meet link on the host's calendar.
- NextAuth Google scopes (`lib/auth.ts`): `calendar.events`, `calendar.freebusy`, `gmail.readonly`. Tokens are stored per teammate in `Account` (refresh token).
- `lib/mail-sync.ts` pulls each teammate's Gmail and files mails exchanged with known contacts under the contact (`EmailMessage`). Hourly cron exists (`vercel.json`).
- Google Cloud project is External / unverified (sensitive scopes show a warning today).

## 1. How the pieces fit (recommended design)
Three jobs, each independent:
A. Know when the meeting really started/ended.
B. Find the Gemini notes Google Doc.
C. Match it to the Booking + contact and show it.

### A. Track start and end
Options:
1. **Meet REST API polling (recommended).** `GET v2/conferenceRecords?filter=space.meeting_code="abc-defg-hij"` using the code parsed from `Booking.meetUrl`. A record gives `startTime` and `endTime` (endTime empty while live). `participants` and `participantSessions` give who joined, when, and for how long. A cron runs every few minutes, but only for bookings whose window is "now" or in the last ~6 h, so the load is tiny.
2. **Workspace Events API push** (`google.workspace.meet.conference.v2.started` / `.ended`, plus `transcript.fileGenerated`). Real time, but needs a Pub/Sub topic + push endpoint, per-user subscriptions that must be renewed, and more GCP setup. Good phase 2 upgrade; not needed at our volume.
3. Fallback if the Meet API is unavailable for a host: Calendar event only (scheduled times) and mark "actual times unknown".

Notes: Recurring/reused links produce several conference records for one code; pick the record whose start is closest to the booking window. Mark `LIVE` while `endTime` is empty. Gaps/rejoins count as one meeting (first start, last end), with per-participant sessions stored for "did the contact actually show up" (a useful no-show signal).

### B. Find and fetch the Gemini notes
Gemini creates the notes Doc a few minutes after the meeting, saves it in the notes-taker's Drive, attaches it to the Calendar event, and emails the host a link. Ordered strategies, first hit wins:
1. **Calendar event attachments (primary).** `events.get(googleEventId)` -> `attachments[]`; the Gemini doc has mimeType `application/vnd.google-apps.document` and a title like "<Meeting> - <date> - Notes by Gemini". Uses the `calendar.events` scope we already hold. Cheap, exact link to the right event, no guessing.
2. **Meet API smart notes / transcript docs.** Under the conference record, `smartNotes` (Gemini notes) and `transcripts` expose `docsDestination.document`. Smart notes is a newer, possibly preview endpoint: must be verified against the live API before relying on it; transcript docs are stable and a fine second source.
3. **Gmail notification email (fallback, zero new scope).** The existing sync already sees the host's mail. Match sender `gemini-notes@google.com` with a docs.google.com link in the body, subject "Notes: <title> <date>". Extract the doc ID from the link. Works even if the Calendar attachment is missing.
4. Drive search by title (`drive.readonly`) is NOT planned: restricted scope, security assessment cost, not needed.

Fetch: Docs API `documents.get` as the host (the host owns/has the doc). Convert to clean text/markdown (Summary, Next steps, Details sections), store the text plus the doc URL; the CRM never duplicates the file itself.

### C. Matching
- Booking <-> meeting: by `meetUrl` meeting code (exact) and `googleEventId` (exact). No fuzzy matching in the normal path.
- Booking -> contact: `Booking.leadId` (else `guestEmail` lookup against `Lead.email`, same rule the mail sync uses).
- Gmail fallback: match mail to Booking by doc already found through the event, or by title + date within the booking window (only used if A/B1 fail); ambiguous matches go to a "needs review" list rather than guessing.
- Notes visible only where the Booking's contact is visible to that user (reuse existing lead access rules).

### Handling the delay
State machine on a new `MeetingNotes` row: `WAITING -> READY | NONE | FAILED`.
- Meeting ends -> row `WAITING`, `nextCheckAt = end + 3 min`.
- Cron retries with backoff: +3, +6, +12, +30 min, then hourly up to 24 h after end. Stop at READY.
- After 24 h with nothing -> `NONE` ("no notes were generated"). A "Check again" button re-queues it manually. A late Gmail sync hit can still flip NONE -> READY.
- Long meetings: notes are only produced after the meeting ends; do not check before `endTime`.

## 2. Google scopes and permissions
Existing (keep): `calendar.events`, `calendar.freebusy`, `gmail.readonly`, identity.
New:
| Scope | Why | Class |
|---|---|---|
| `meetings.space.readonly` | read conference records, participants, transcripts/smart notes | Sensitive |
| `documents.readonly` | read the Gemini notes Doc | Sensitive |
Not needed: `drive.readonly` (restricted). `meetings.space.created` alone is not enough because spaces are created by Calendar, not by the Meet API.
Console work (owner / admin, ~30 min): enable Google Meet REST API and Google Docs API in the Cloud project; add the two scopes to the OAuth consent screen. Adding sensitive scopes means the existing unverified-app flow needs Google verification before we go beyond 100 users (we are a handful of teammates, so the unverified warning stays acceptable; verification can be started in parallel but is not blocking).
Re-consent: every teammate must reconnect Google once (we already detect missing scopes via `Account.scope`, same pattern as `GMAIL_READ_SCOPE`). Teammates who have not reconnected show "Reconnect Google to track meetings" instead of failing.
Workspace admin settings (Igani Workspace): Gemini notes must be enabled for the OU, and users need a Gemini-eligible Workspace edition. Meet API access for user data is allowed by default; if an admin restricted third-party app access, the CRM OAuth client must be allow-listed.

## 3. Data model changes (Prisma, additive, no destructive change)
```
model MeetingSession {          // actual call
  id, bookingId (unique), conferenceRecordName (unique, "conferenceRecords/xyz"),
  meetingCode, status (SCHEDULED|LIVE|ENDED|NOT_HELD),
  actualStart DateTime?, actualEnd DateTime?, durationSec Int?,
  contactJoined Boolean?, hostJoined Boolean?,
  lastCheckedAt, createdAt, updatedAt
}
model MeetingParticipant {      // per-person attendance
  id, sessionId, email?, displayName, firstJoinedAt, lastLeftAt, totalSec, isSignedIn
}
model MeetingNotes {
  id, bookingId (unique), sessionId?, status (WAITING|READY|NONE|FAILED),
  source (CALENDAR_ATTACHMENT|MEET_API|GMAIL), docId?, docUrl?, docTitle?,
  summaryText @db.Text?, fullText @db.Text? (capped ~100k),
  attempts Int, nextCheckAt DateTime?, lastError String?, fetchedAt?, createdAt, updatedAt
}
```
Booking gets back-relations only; existing columns unchanged. `ActivityLog` entries: "Meeting started/ended", "Gemini notes attached" (shows on the contact timeline). Migration applies automatically on deploy (already set up).

## 4. CRM UI
- **Booking / contact page**: a "Call" card: status chip (Scheduled / Live now / Ended), actual start - end, duration, scheduled vs actual, who joined (contact attended yes/no).
- **Notes block** under it: "Gemini notes" with summary and next steps rendered, "Open in Google Docs" link, "Show full notes" expander, status text while waiting ("Notes usually appear 3-10 min after the call"), "Check again" button, and an honest empty state ("Notes off for this meeting" / "No notes generated").
- **Contact timeline**: meeting + notes entries interleaved with emails.
- **Sales Today / bookings list**: "Live" badge; "Ended, notes ready" badge; no-show highlight.
- **Settings page**: per-teammate Google status ("Meet tracking: connected / reconnect") reusing the Gmail connect card pattern.
- **Admin**: "Needs review" list for unmatched notes mails; sync health (last run, errors).
No new heavy pages; mostly cards inside existing booking/lead views.

## 5. Edge cases
- **Host not an @igani.co account**: Meet API/Docs/Calendar all work with any Google account the host connected, but Gemini notes exist only on eligible paid Workspace/Gemini plans. Personal Gmail host -> track times, notes show "Gemini notes not available for this account". The CRM only reads data for the signed-in teammate's own account, never impersonates (no domain-wide delegation in v1).
- **Gemini host is the guest, not the teammate**: the doc sits in the guest's Drive and is only emailed to them. We get it only if it was attached to the event / shared with the teammate. Otherwise `NONE` with message "Notes were taken by someone outside your team". Optional later: ask the guest to forward/share.
- **Notes disabled / not started in the meeting**: Gemini notes must be turned on during the call (or auto-on by admin). No doc -> NONE after 24 h; the UI says so, not an error.
- **Doc permissions**: doc not accessible with host's token (403) -> FAILED with a "Open in Docs" link only, retry later.
- **Meeting never happened**: no conference record by end + 30 min -> `NOT_HELD`; stops all polling.
- **Meeting rescheduled/cancelled** (`googleEventId` changes or booking CANCELLED): cancel pending checks.
- **Reused meeting link / several calls same day**: match by time overlap; ambiguity -> review list.
- **Token expired/revoked**: pause that teammate's checks, show reconnect prompt (same handling as Gmail `GmailNotConnectedError`).
- **Privacy**: notes can contain sensitive discussion; stored only for bookings tied to a contact, shown only to users who can see the contact, truncated at a cap, deletable with the contact (cascade).

## 6. Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Meet API `smartNotes` may be preview / change | Source 2 breaks | It is only the second source; Calendar attachment + Gmail cover us. Verify in a 1-hour spike first |
| Calendar attachment not always added | Notes missed | Gmail fallback; manual "paste notes link" field |
| Sensitive-scope verification delays | Warning screen stays | Fine for a small internal team; verification runs in parallel |
| Vercel cron frequency (plan-dependent; hourly today) | Slow detection | Hourly is OK for "ended" but too slow for the notes delay: needs Pro (every 5 min) or a lightweight external pinger / phase-2 push events. Owner to confirm the Vercel plan |
| Gemini notes format changes | Parser breaks | Store raw text + link; section parsing is best effort |
| Notes contain confidential info | Data exposure | Access rules, no logging of content, size cap |
| Reconnect friction | Some teammates have no tracking | Clear banner, one click |

## 7. Build order and rough effort
1. **Spike (0.5 day):** with one real meeting, confirm Meet API conference record fields, Calendar attachment, `smartNotes`, doc fetch. Output: confirmed or adjusted plan.
2. **Console + scopes (0.25 day, owner):** enable APIs, add scopes, reconnect teammates.
3. **Schema + migration + google client helpers (0.5 day).**
4. **Meeting tracking job (1 day):** poll conference records, state machine, participants, activity log, tests with fake API (mirrors `mail-sync` test style).
5. **Notes fetcher (1 day):** Calendar attachment -> Docs fetch -> text extraction; retry/backoff; Gmail fallback; tests.
6. **Cron + manual "check again" action (0.5 day).**
7. **UI (1.5 days):** Call card, notes block, timeline, badges, settings status, admin review list.
8. **Hardening + end-to-end real-meeting test, docs (0.75 day).**
Total about 5-6 working days. Optional phase 2: Workspace Events push for real-time start/end (+1.5 days), AI action-item extraction into tasks (+1 day).

## 8. Decisions needed from the owner
1. Approve the two new scopes (Meet readonly, Docs readonly) and teammates re-connecting Google once.
2. Confirm Vercel plan / OK to upgrade cron frequency (5-minute checks).
3. Notes stored in the CRM as text (searchable) plus link, or link only?
4. Who takes the notes in practice: always the teammate host? (If guests often host, scope shrinks to times only.)
5. Go ahead with the 0.5-day spike first?
