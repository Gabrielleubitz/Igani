# CRM production release

- Date: 2026-11-01
- main pushed to origin (7d34552..bf21c7b): Today calendar -> Google sync, tests, redesigned calendar dialogs.
- Prod DB migration applied by hand: `ALTER TABLE "CalendarEntry" ADD COLUMN IF NOT EXISTS "googleEventId" TEXT;`
- Deployed with `vercel --prod` (crm project) -> https://app.igani.co (READY, deployment dpl_GLC7ngzVnmJ5wYkRbLuEtPEk9vrY).
- Other CRM branches (crm-audit-upgrade*) are already contained in main.
