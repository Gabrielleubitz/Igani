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

```bash
curl -X POST https://app.igani.co/api/v1/leads \
  -H "x-api-key: $LEAD_WEBHOOK_SECRET" -H "content-type: application/json" \
  -d '{"email":"dana@acme.com","firstName":"Dana","company":"Acme","budget":"$5k","message":"Hi",
       "source":"igani.co/contact","utm":{"source":"google","medium":"cpc","campaign":"fall"}}'
```
`201 {id, duplicate:false}` new lead · `200 {id, duplicate:true}` existing email · `401` bad key · `422` invalid.

## Task reminders (cron)

`vercel.json` runs `GET /api/public/cron/task-reminders` hourly. It emails each assignee a digest of overdue / due-today
tasks (once per task). Set `CRON_SECRET` in the Vercel project env; Vercel then sends `Authorization: Bearer $CRON_SECRET`.
The path is public in the middleware but returns `401` without the exact secret (and always when `CRON_SECRET` is unset).

```bash
curl -i https://app.igani.co/api/public/cron/task-reminders -H "Authorization: Bearer $CRON_SECRET"   # 200 {checked, emailed}
```

## Tests

```bash
npm test                                   # unit tests (slots/DST, tokens, ics, roles)
TEST_DATABASE_URL=postgresql://localhost:5432/igani_crm_test npm test   # + DB flows (wipes that DB!)
```
