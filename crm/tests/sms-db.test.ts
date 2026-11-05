import { PrismaClient } from '@prisma/client'
import twilio from 'twilio'
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
const session = { user: null as null | { id: string; email: string; role: 'SALES'; name: string | null } }
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), requireUser: async () => session.user }))
// Twilio is never reached
const sent: { from: string; to: string; body: string; statusCallback: string }[] = []
const tw = { fail: null as null | { code: number; message: string } }
vi.mock('@/lib/twilio', async (orig) => ({
  ...(await orig<typeof import('@/lib/twilio')>()),
  sendTwilioSms: async (_c: unknown, m: (typeof sent)[number]) => {
    if (tw.fail) throw Object.assign(new Error(tw.fail.message), { code: tw.fail.code })
    sent.push(m)
    return { sid: 'SM' + String(sent.length).padStart(32, '0'), status: 'queued' }
  },
}))

const d = testDb ? describe : describe.skip

d('text messages', async () => {
  const smsRoute = await import('@/app/api/public/voice/sms/route')
  const statusRoute = await import('@/app/api/public/voice/sms-status/route')
  const { sendText, smsThreads, smsConversation, smsUnread } = await import('@/app/actions/sms')
  const prisma = new PrismaClient()
  let repId = ''
  let otherId = ''
  let leadId = ''
  const signed = (path: string, params: Record<string, string>, query = '') => {
    const url = `https://app.igani.co/api/public/voice/${path}${query}`
    const sig = twilio.getExpectedTwilioSignature('auth-token-for-tests', url, params)
    return new Request(url, { method: 'POST', body: new URLSearchParams(params).toString(), headers: { 'x-twilio-signature': sig, 'content-type': 'application/x-www-form-urlencoded' } })
  }
  const incoming = (body: string, sid: string, from = '+972501234567') => smsRoute.POST(signed('sms', { MessageSid: sid, From: from, To: '+972535635453', Body: body, NumMedia: '0' }))

  beforeEach(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.smsMessage.deleteMany()
    await prisma.call.deleteMany()
    await prisma.phoneLine.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.siteSetting.deleteMany()
    sent.length = 0
    tw.fail = null
    repId = (await prisma.user.create({ data: { email: 'rep@igani.co', name: 'Rita', role: 'SALES' } })).id
    otherId = (await prisma.user.create({ data: { email: 'sam@igani.co', name: 'Sam', role: 'SALES' } })).id
    await prisma.phoneLine.createMany({ data: [{ userId: repId, number: '+972535635453' }, { userId: otherId, number: '+972532222222' }] })
    leadId = (await prisma.lead.create({ data: { firstName: 'Dana', phone: '050-123-4567', assignedToId: repId } })).id
    session.user = { id: repId, email: 'rep@igani.co', role: 'SALES', name: 'Rita' }
  })
  afterAll(async () => {
    await prisma.smsMessage.deleteMany()
    await prisma.$disconnect()
  })

  it('an incoming text lands in the line owner’s messages and on the contact’s timeline, once', async () => {
    expect((await smsRoute.POST(new Request('https://app.igani.co/api/public/voice/sms', { method: 'POST', body: 'From=x' }))).status).toBe(403)
    const res = await incoming('שלום, מתי נדבר?', 'SM' + 'a'.repeat(32))
    expect(await res.text()).toContain('<Response></Response>')
    await incoming('שלום, מתי נדבר?', 'SM' + 'a'.repeat(32)) // Twilio retried
    expect(await prisma.smsMessage.count()).toBe(1)
    expect(await prisma.smsMessage.findFirstOrThrow()).toMatchObject({ userId: repId, leadId, direction: 'INBOUND', otherNumber: '+972501234567', status: 'received' })
    expect(await prisma.activityLog.count({ where: { entityId: leadId, action: 'sms.received' } })).toBe(1)
    expect(await smsUnread()).toEqual({ ok: true, data: 1 })
    const threads = await smsThreads()
    expect(threads.ok && threads.data).toMatchObject([{ number: '+972501234567', name: 'Dana', unread: 1, leadId }])
    // opening it marks it read
    const conv = await smsConversation('050-123-4567')
    expect(conv.ok && conv.data.messages.map((m) => m.body)).toEqual(['שלום, מתי נדבר?'])
    expect(await smsUnread()).toEqual({ ok: true, data: 1 - 1 })
    // someone else sees nothing of it
    session.user = { id: otherId, email: 'sam@igani.co', role: 'SALES', name: 'Sam' }
    expect((await smsThreads()).ok && ((await smsThreads()) as { data: unknown[] }).data).toEqual([])
  })

  it('sends from your own line, tracks delivery forward only, and explains refusals', async () => {
    const r = await sendText({ to: '050-123-4567', body: 'Hi Dana, sending the proposal now' })
    if (!r.ok) throw new Error(r.error)
    expect(r.data.status).toBe('queued')
    expect(sent[0]).toMatchObject({ from: '+972535635453', to: '+972501234567' })
    expect(sent[0]!.statusCallback).toBe(`https://app.igani.co/api/public/voice/sms-status?callId=${r.data.id}`)
    expect(await prisma.activityLog.count({ where: { entityId: leadId, action: 'sms.sent' } })).toBe(1)
    const status = (s: string) => statusRoute.POST(signed('sms-status', { MessageSid: 'SM' + '1'.padStart(32, '0'), MessageStatus: s }, `?callId=${r.data.id}`))
    await status('delivered')
    await status('sent') // late, out of order
    expect((await prisma.smsMessage.findUniqueOrThrow({ where: { id: r.data.id } })).status).toBe('delivered')

    tw.fail = { code: 21610, message: 'unsubscribed' }
    const f = await sendText({ to: '050-123-4567', body: 'again' })
    expect(f.ok && f.data).toMatchObject({ status: 'failed', error: 'They replied STOP, so they can’t be texted from this number.' })
    expect((await sendText({ to: '050-123-4567', body: '   ' })).ok).toBe(false)
  })

  it('never texts another rep’s client', async () => {
    await prisma.lead.create({ data: { firstName: 'Moshe', phone: '052-999-8888', assignedToId: otherId } })
    const r = await sendText({ to: '0529998888', body: 'hello' })
    expect(r.ok).toBe(false)
    expect(sent).toHaveLength(0)
  })
})
