/**
 * Bootstraps the whitelist with the first ADMIN (nobody can sign in otherwise).
 *   npm run db:seed -- you@igani.co
 * or SEED_ADMIN_EMAILS="a@igani.co,b@igani.co" npm run db:seed
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main(): Promise<void> {
  const emails = [...process.argv.slice(2), ...(process.env.SEED_ADMIN_EMAILS ?? '').split(',')]
    .map((e) => e.trim().toLowerCase())
    .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))
  if (emails.length === 0) throw new Error('Pass at least one admin email: npm run db:seed -- you@igani.co')
  for (const email of emails) {
    await prisma.allowedUser.upsert({ where: { email }, create: { email, role: 'ADMIN' }, update: { role: 'ADMIN', active: true } })
    console.log(`✓ ${email} whitelisted as ADMIN`)
  }
}

main()
  .catch((err: unknown) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => void prisma.$disconnect())
