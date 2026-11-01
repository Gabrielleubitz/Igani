# CRM release rule

Owner standing order: whenever CRM work is done, merge it to `main` AND deploy to production, every time, without being asked.

1. Merge CRM branch into `main`, `git push origin main`.
2. Deploy from repo root (the Vercel `igani-crm` project has Root Directory `crm`; plain `vercel` in root deploys the marketing site):

   VERCEL_PROJECT_ID=prj_aJDhVamW3aE72Ni0YyxxUnqppl6C VERCEL_ORG_ID=team_OOdXeH0RorrG3pvjMgOYSHs4 npx vercel --prod --yes

   If the build fails fetching fonts.gstatic.com, retry.
3. New Prisma migrations are NOT applied on deploy (prod DB not baselined). Apply by hand: `npx vercel env pull`, then `prisma db execute --stdin` with the migration SQL.
4. Verify: `npx vercel inspect <url>` shows Ready; https://app.igani.co responds (307 to login is normal).

Last release: 2026-11-01, deployment dpl_5APB45X2WYhSpnEuhJX48QLcboys (main @ 6b10626).
