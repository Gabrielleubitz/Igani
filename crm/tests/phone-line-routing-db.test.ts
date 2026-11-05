import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, {
  NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret',
  NEXT_PUBLIC_APP_URL: 'https://app.igani.co',
  TWILIO_ACCOUNT_SID: 'AC' + '1'.repeat(32),
  TWILIO_AUTH_TOKEN: 'auth-token-for-tests',
  TWILIO_API_KEY_SID: 'SK' + '2'.repeat(32),
  TWILIO_API_KEY_SECRET: 'api-key-secret',
  TWILIO_TWIML_APP_SID: 'AP' + '3'.repeat(32),
})

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }))
const session = { user: null as null | { id: string; email: string; role: 'ADMIN'; name: string | null } }
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), requireUser: async () => session.user }))
// Twilio is never reached: one number on the account, routed to a demo bin
const SID = 'PN' + 'a'.repeat(32)
const tw = { voiceUrl: 'https://demo.twilio.com/welcome/voice/', routed: 0, fail: false }
vi.mock('@/lib/twilio', async (orig) => {
  const real = await orig<typeof import('@/lib/twilio')>()
  return {
    ...real,
    listTwilioNumbers: async () => {
      if (tw.fail) throw new Error('The authorization with Key failed')
      return [{ sid: SID, number: '+972535635453', name: 'IL', voice: true, voiceUrl: tw.voiceUrl, voiceAppSid: '' }]
    },
    routeNumberToCrm: async () => {
      tw.routed++
      const before = { voiceUrl: tw.voiceUrl, voiceMethod: 'POST', voiceAppSid: '' }
      tw.voiceUrl = real.incomingUrl()
      return before
    },
  }
})

const d = testDb ? describe : describe.skip

d('assigning a number sets up its incoming calls', async () => {
  const { assignPhoneLine } = await import('@/app/actions/phone-lines')
  const prisma = new PrismaClient()
  let adminId = ''
  let repId = ''
  beforeEach(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.call.deleteMany()
    await prisma.phoneLine.deleteMany()
    await prisma.siteSetting.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    Object.assign(tw, { voiceUrl: 'https://demo.twilio.com/welcome/voice/', routed: 0, fail: false })
    adminId = (await prisma.user.create({ data: { email: 'boss@igani.co', role: 'ADMIN' } })).id
    repId = (await prisma.user.create({ data: { email: 'rep@igani.co', role: 'SALES' } })).id
    session.user = { id: adminId, email: 'boss@igani.co', role: 'ADMIN', name: 'Boss' }
  })
  afterAll(async () => {
    await prisma.phoneLine.deleteMany()
    await prisma.siteSetting.deleteMany()
    await prisma.$disconnect()
  })

  it('a typed number is found in Twilio, routed to the CRM once, and the old routing kept for undo', async () => {
    expect(await assignPhoneLine({ userId: repId, number: '+972 53-563-5453' })).toEqual({ ok: true, data: { incoming: 'routed' } })
    expect(await prisma.phoneLine.findUniqueOrThrow({ where: { userId: repId } })).toMatchObject({ number: '+972535635453', twilioSid: SID })
    expect((await prisma.siteSetting.findUniqueOrThrow({ where: { key: `voice.routing:${SID}` } })).value).toMatchObject({ voiceUrl: 'https://demo.twilio.com/welcome/voice/' })
    // saving again: already ringing in the CRM, nothing changed
    expect(await assignPhoneLine({ userId: repId, number: '+972535635453', twilioSid: SID })).toEqual({ ok: true, data: { incoming: 'already' } })
    expect(tw.routed).toBe(1)
  })

  it('a Twilio problem never stops the assignment', async () => {
    tw.fail = true
    expect(await assignPhoneLine({ userId: repId, number: '+972535635453' })).toEqual({ ok: true, data: { incoming: 'failed' } })
    expect(await prisma.phoneLine.count({ where: { userId: repId } })).toBe(1)
    tw.fail = false
    expect(await assignPhoneLine({ userId: adminId, number: '+972501234567' })).toEqual({ ok: true, data: { incoming: 'not-found' } })
  })
})
