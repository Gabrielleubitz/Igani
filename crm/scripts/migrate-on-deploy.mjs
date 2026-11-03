// Applies pending Prisma migrations during the build, so nobody has to run `prisma migrate deploy` by hand.
// Runs only for Vercel *production* deploys (preview builds must never change the production database),
// or anywhere when MIGRATE_ON_BUILD=1. If a migration fails the build fails, so new code never runs on an old schema.
import { execSync } from 'node:child_process'

const production = process.env.VERCEL_ENV === 'production'
const forced = process.env.MIGRATE_ON_BUILD === '1'

if (!production && !forced) {
  console.log(`[migrate] skipped (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'unset'}); set MIGRATE_ON_BUILD=1 to force`)
  process.exit(0)
}
if (!process.env.DATABASE_URL) {
  console.error('[migrate] DATABASE_URL is not set for this deployment; cannot apply migrations.')
  process.exit(1)
}
// Neon's pooled address (…-pooler.…) runs through PgBouncer, which Prisma migrations don't support reliably.
// Migrations use the direct address (same host without "-pooler"); the app itself keeps using the pooler.
const directUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL.replace(/-pooler\./, '.')
console.log(`[migrate] applying pending migrations${directUrl !== process.env.DATABASE_URL ? ' (direct connection)' : ''}…`)
execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, DATABASE_URL: directUrl } })
