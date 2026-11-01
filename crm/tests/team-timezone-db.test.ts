import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, {
  NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret',
  GOOGLE_CLIENT_ID: 'id',
  GOOGLE_CLIENT_SECRET: 'secret',
  RESEND_API_KEY: 're_test',
  EMAIL_FROM: 'Igani <bookings@igani.co>',
  LEAD_WEBHOOK_SECRET: 'webhook-secret-webhook-secret',
  NEXT_PUBLIC_APP_URL: 'https://app.igani.co',
})

const d = testDb ? describe : describe.skip

d('time zone chosen when adding a teammate', async () => {
  const { timeZoneFor } = await import('@/lib/auth')
  const prisma = new PrismaClient()
  beforeEach(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.allowedUser.deleteMany()
  })
  afterAll(async () => prisma.$disconnect())

  it('uses the zone the admin picked, the latest one if changed, else Jerusalem', async () => {
    const a = await prisma.allowedUser.create({ data: { email: 'new@igani.co', role: 'SALES' } })
    expect(await timeZoneFor('New@igani.co')).toBe('Asia/Jerusalem') // nothing chosen yet
    expect(await timeZoneFor('stranger@igani.co')).toBe('Asia/Jerusalem')
    await prisma.activityLog.create({ data: { entityType: 'ALLOWED_USER', entityId: a.id, action: 'whitelist.upserted', metadata: { email: 'new@igani.co', timeZone: 'Europe/London' } } })
    expect(await timeZoneFor('new@igani.co')).toBe('Europe/London')
    await prisma.activityLog.create({ data: { entityType: 'ALLOWED_USER', entityId: a.id, action: 'whitelist.upserted', metadata: { email: 'new@igani.co', role: 'SALES' } } }) // a later role change
    expect(await timeZoneFor('new@igani.co')).toBe('Europe/London')
    await prisma.activityLog.create({ data: { entityType: 'ALLOWED_USER', entityId: a.id, action: 'whitelist.upserted', metadata: { email: 'new@igani.co', timeZone: 'America/New_York' } } })
    expect(await timeZoneFor('new@igani.co')).toBe('America/New_York')
  })
})
