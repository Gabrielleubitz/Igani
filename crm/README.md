# Igani CRM — app.igani.co

Internal CRM & scheduling app (Next.js 14 App Router, Tailwind + shadcn-style UI, Prisma/Postgres,
NextAuth Google, Resend, Google Calendar). Lives in `crm/` as its own Next app so the marketing site
(repo root) is untouched. Deploy it as a separate Vercel project with **Root Directory = `crm`**.

## What's where

| Deliverable | File |
|---|---|
| Prisma schema (Role, LeadStatus, AllowedUser, User/Account, Lead, Booking, Availability, BookingPage, ActivityLog) | `prisma/schema.prisma` |
| NextAuth (Google, whitelist `signIn`, role + id in JWT, token refresh persisted) | `lib/auth.ts` |
| Edge middleware (`/admin/*` ADMIN, `/sales/*` ADMIN+SALES, `/marketing/*`, `/api/*`) | `middleware.ts`, `lib/roles.ts` |
| Lead webhook `POST /api/v1/leads` (x-api-key, Zod, dedupe, audit, async round-robin) | `app/api/v1/leads/route.ts`, `lib/leads.ts` |
| `getAvailableSlots(hostId, date, durationMinutes)` (hours + Google free/busy + held bookings) | `lib/calendar.ts`, `lib/slots.ts` |
| `createSalesInvite()` / `confirmInvite(token)` + public booking + approve/cancel | `app/actions/bookings.ts`, `lib/bookings.ts` |
| Branded email with Meet CTA + `.ics` attachment | `emails/BookingConfirmed.tsx`, `lib/email.ts`, `lib/ics.ts` |
| Audit log engine | `lib/audit.ts`, `/admin/audit` |

Pages: `/sales` pipeline (stages, claim / manual / round-robin assignment), `/sales/invite`,
`/sales/availability`, `/marketing` (UTM stats), `/admin/bookings` (approvals), `/admin/booking-pages`,
`/admin/users` (whitelist), `/admin/audit`, public `/book/[slug]` and `/invites/[token]`.

## Setup

1. Env vars — see `.env.example`. All are validated at runtime with a readable error.
2. Google Cloud: OAuth client (Web), redirect `https://app.igani.co/api/auth/callback/google`; enable the
   **Google Calendar API**; consent screen scopes `calendar.events` + `calendar.freebusy`. Set the app type
   to **Internal** (Workspace) to skip Google's sensitive-scope verification.
3. `npm install && npx prisma migrate deploy`
4. Whitelist the first admin: `npm run db:seed -- you@igani.co` (nobody can sign in before this).
5. Each host signs in once (grants calendar access), sets **My hours**, and an admin creates a booking page.

## Lead webhook (from igani.co)

Every lead form on the marketing site forwards here through `lib/crm.ts` in the site repo: the contact page
(`/api/contact`), landing pages and funnels (`/api/leads`: /realestate, /start, /funnels…) and `/api/funnel-submission`.
Each lead carries **where it came from**: `source` (the channel shown as "Came from") and `sourceDetail` (page · form · campaign).

```bash
curl -X POST https://app.igani.co/api/v1/leads \
  -H "x-api-key: $LEAD_WEBHOOK_SECRET" -H "content-type: application/json" \
  -d '{"email":"dana@acme.com","firstName":"Dana","phone":"058-000-0000","message":"Hi",
       "source":"Landing page","sourceDetail":"/realestate · call_back",
       "utm":{"source":"google","medium":"cpc","campaign":"fall"}}'
```
- Needs an **email or a phone** (phone-only funnel leads are fine). Matching: email first, else the last 9 digits of the phone.
- `submittedAt` (ISO) and `backfill: true` are for historical imports: original date kept, tagged `imported`,
  no alert emails and no round-robin, and re-sending is a no-op.
- `201 {id, duplicate:false}` new lead · `200 {id, duplicate:true}` existing · `401` bad key · `422` invalid.

**Site setup** (marketing site's Vercel project): `CRM_LEAD_WEBHOOK_URL=https://app.igani.co/api/v1/leads`,
`CRM_LEAD_WEBHOOK_SECRET` (same value as the CRM's `LEAD_WEBHOOK_SECRET`), optional `NEXT_PUBLIC_CRM_URL`, and
`ADMIN_PASSWORD` (server-only, never `NEXT_PUBLIC_`) which the sync button asks for. To bring in leads that arrived before the connection,
open the site's **/admin → Inquiries** or **→ Leads** and press **Send … to CRM** (safe to repeat).

In the CRM anyone (admin, sales, marketing) can set **Came from** + details when adding a contact or under
*Edit details*; the Contacts table shows it, and Reports / Marketing break results down by it.

## Email conversations (Gmail sync)

Each contact page has an **Emails** card: every email exchanged with that contact, both directions. It includes emails
sent from the CRM, the client's replies, emails they send you directly, and emails you send them from Gmail. Unread
client emails show on **Today** and as a badge on the contact; replying from the CRM quotes and threads the original.

- How: each teammate clicks **Connect Gmail** once (Google asks for read-only Gmail access). The hourly cron and
  opening a contact pull new mail. Only messages where a known contact's email is in From/To/Cc are stored; the
  rest of the mailbox is never saved. An email in two teammates' inboxes is stored once (matched by Message-ID).
- Google Cloud setup: enable the **Gmail API** in the same project as Calendar, and add the
  `https://www.googleapis.com/auth/gmail.readonly` scope under **OAuth consent screen → Data access**.
- Status per teammate (connected / last error) is on **Team**.

**Current state of the `igani` Google project:** Gmail API on, `gmail.readonly` saved. The project is not inside a
Google Workspace organization, so the app is **External · In production · unverified** ("Make internal" is greyed out).
Sync works, with two consequences:

- **"Google hasn't verified this app" warning.** When a teammate clicks *Connect Gmail*, Google shows this first.
  It is expected and safe: click **Advanced → Go to igani (unsafe) → Allow**. It's our own app asking for read-only
  access to the signed-in teammate's mailbox.
- **User cap of 100** Google accounts for the app (2 used), which is plenty for the team.

To remove the warning (recommended, no Google review): a Workspace admin signs in to console.cloud.google.com with an
@igani.co account (this creates the igani.co organization), moves the project under **IAM & Admin → Settings →
Migrate**, then sets **OAuth consent screen → Make internal**. The alternative, Google verification of a restricted
scope, needs a demo video and usually a paid security assessment, which isn't worth it for internal use.

**If something goes wrong when connecting Gmail**

- *"Google hasn't verified this app"*: expected (see above): **Advanced → Go to igani (unsafe) → Allow**.
- *"Access blocked" / "This app is blocked"*: the Gmail API is off, or the `gmail.readonly` scope isn't saved under
  Data access. If neither, the 100-user cap may be reached (Google Cloud → OAuth consent screen shows the count).
- *The "Connect Gmail" banner is still there after allowing*: sign out of the CRM, sign back in, connect again.
  Make sure the "Read your email messages and settings" box was ticked on Google's screen.
- *Team page shows "Gmail sync error"*: the message there says why (most often the access was removed in the
  Google account's security settings; connect again).

## Google Meet tracking + Gemini notes

Calls booked from the CRM (they all get a Google Meet link) are tracked automatically:
- **Start / end:** the Meet REST API gives the real time the call started and ended and who joined. While a call is
  on, the contact page and Today show **Live now**; afterwards **Call held · 10:02 – 10:41 · 39 min**. If nobody
  joins within an hour of the scheduled end it is marked **No-show**.
- **Gemini notes:** only when the host is an `@igani.co` teammate (that is where Gemini takes notes). After the call
  the CRM looks for the notes Doc, in order: the Doc Gemini attaches to the Calendar event, the Meet API's smart notes,
  then Gemini's "Notes: …" email in the host's Gmail. It reads the Doc (Docs API) and shows the summary and next
  steps on the contact, with "Show full notes" and "Open in Google Docs". Checks retry at +3, +5, +10, +15, +30 min,
  then hourly, and stop after 24 h ("No Gemini notes were made"). **Check again** forces a look.
- **When it runs:** the hourly cron, plus in the background whenever a teammate opens Today or the contact
  (every minute while a call is about to start or live). Code: `lib/meetings.ts`, `lib/meet-notes.ts`.
- **Google setup:** Meet REST API and Google Docs API are enabled in the `igani-478718` project. New read-only scopes
  `meetings.space.readonly` and `documents.readonly` are requested at sign-in; each teammate clicks
  **Reconnect Google** (banner in the Meetings card) once. Without them, notes still come through the Calendar/Gmail
  link, but times and Doc text need the reconnect.

## Task reminders (cron)

`vercel.json` runs `GET /api/public/cron/task-reminders` hourly. Each run (one at a time, via a lease row): creates
follow-up tasks for calls that ended, emails guests a reminder ~24h before meetings, closes booking requests whose time
passed without approval, and emails each person a digest of their overdue / due-today tasks (in their own time zone,
between 07:00 and 20:00 local), once per task and due date. Set `CRON_SECRET` in the Vercel project env; Vercel then sends `Authorization: Bearer $CRON_SECRET`.
The path is public in the middleware but returns `401` without the exact secret (and always when `CRON_SECRET` is unset).

```bash
curl -i https://app.igani.co/api/public/cron/task-reminders -H "Authorization: Bearer $CRON_SECRET"   # 200 {checked, emailed}
```

## Tests

```bash
npm test                                   # unit tests (slots/DST, tokens, ics, roles)
TEST_DATABASE_URL=postgresql://localhost:5432/igani_crm_test npm test   # + DB flows (wipes that DB!)
```
