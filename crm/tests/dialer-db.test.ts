import { PrismaClient } from '@prisma/client'
import twilio from 'twilio'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

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

const d = testDb ? describe : describe.skip

d('dialer: webhooks and call state', async () => {
  const { advanceCall } = await import('@/lib/calls')
  const twimlRoute = await import('@/app/api/public/voice/twiml/route')
  const statusRoute = await import('@/app/api/public/voice/status/route')
  const recordingRoute = await import('@/app/api/public/voice/recording/route')
  const prisma = new PrismaClient()
  let userId = ''
  let leadId = ''

  const signed = (path: string, params: Record<string, string>, query = '', token = 'auth-token-for-tests') => {
    const url = `https://app.igani.co/api/public/voice/${path}${query}`
    const sig = twilio.getExpectedTwilioSignature(token, url, params)
    return new Request(url, { method: 'POST', body: new URLSearchParams(params).toString(), headers: { 'x-twilio-signature': sig, 'content-type': 'application/x-www-form-urlencoded' } })
  }
  const newCall = (over: object = {}) => prisma.call.create({ data: { userId, leadId, direction: 'OUTBOUND', fromNumber: '+972531111111', toNumber: '+972501234567', ...over } })

  beforeEach(async () => {
    await prisma.call.deleteMany()
    await prisma.phoneLine.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.siteSetting.deleteMany()
    userId = (await prisma.user.create({ data: { email: 'rep@igani.co', name: 'Rita', role: 'SALES' } })).id
    await prisma.phoneLine.create({ data: { userId, number: '+972531111111' } })
    leadId = (await prisma.lead.create({ data: { email: 'dana@x.com', firstName: 'Dana', phone: '050-123-4567' } })).id
  })
  afterAll(async () => {
    await prisma.call.deleteMany()
    await prisma.phoneLine.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  it('dials only for the caller’s own fresh call, from their own number, once', async () => {
    const call = await newCall()
    const params = { CallSid: 'CA' + 'a'.repeat(32), From: `client:u_${userId}`, callId: call.id }
    const res = await twimlRoute.POST(signed('twiml', params))
    const xml = await res.text()
    expect(xml).toContain('callerId="+972531111111"')
    expect(xml).toContain('<Number')
    expect(xml).toContain('+972501234567</Number>')
    expect(xml).toContain('record="record-from-answer-dual"')
    expect(xml).toContain('/api/public/voice/whisper?callId=') // consent message before connecting
    // the same request replayed can't dial again
    expect(await (await twimlRoute.POST(signed('twiml', { ...params, CallSid: 'CA' + 'b'.repeat(32) }))).text()).toContain('<Hangup/>')
  })

  it('refuses unsigned requests, other users, old calls and simulated calls', async () => {
    const call = await newCall()
    const params = { CallSid: 'CA' + 'c'.repeat(32), From: `client:u_${userId}`, callId: call.id }
    expect((await twimlRoute.POST(signed('twiml', params, '', 'wrong-token'))).status).toBe(403)
    const other = await prisma.user.create({ data: { email: 'x@igani.co', role: 'SALES' } })
    expect(await (await twimlRoute.POST(signed('twiml', { ...params, From: `client:u_${other.id}` }))).text()).toContain('<Hangup/>')
    const old = await newCall({ startedAt: new Date(Date.now() - 10 * 60_000) })
    expect(await (await twimlRoute.POST(signed('twiml', { ...params, callId: old.id }))).text()).toContain('<Hangup/>')
    const sim = await newCall({ simulated: true })
    expect(await (await twimlRoute.POST(signed('twiml', { ...params, callId: sim.id }))).text()).toContain('<Hangup/>')
    expect(await prisma.call.count({ where: { twilioCallSid: { not: null } } })).toBe(0)
  })

  it('never dials when the line is switched off or the country isn’t allowed', async () => {
    await prisma.phoneLine.update({ where: { userId }, data: { active: false } })
    const a = await newCall()
    expect(await (await twimlRoute.POST(signed('twiml', { CallSid: 'CA' + 'd'.repeat(32), From: `client:u_${userId}`, callId: a.id }))).text()).toContain('not active')
    await prisma.phoneLine.update({ where: { userId }, data: { active: true } })
    await prisma.siteSetting.create({ data: { key: 'voice.countries', value: ['US'] } })
    const b = await newCall()
    expect(await (await twimlRoute.POST(signed('twiml', { CallSid: 'CA' + 'e'.repeat(32), From: `client:u_${userId}`, callId: b.id }))).text()).toContain('cannot be called')
    expect((await prisma.call.findUniqueOrThrow({ where: { id: b.id } })).status).toBe('FAILED')
  })

  it('status callbacks move the call forward only and log the end on the lead once', async () => {
    const call = await newCall({ twilioCallSid: 'CA' + 'f'.repeat(32) })
    const send = (CallStatus: string, extra: Record<string, string> = {}) => statusRoute.POST(signed('status', { CallSid: 'CA' + '9'.repeat(32), CallStatus, ...extra }, `?callId=${call.id}`))
    await send('ringing')
    await send('in-progress')
    await send('completed', { CallDuration: '95' })
    await send('completed', { CallDuration: '95' }) // duplicate
    await send('ringing') // late, out of order
    const row = await prisma.call.findUniqueOrThrow({ where: { id: call.id } })
    expect(row).toMatchObject({ status: 'COMPLETED', durationSec: 95, childCallSid: 'CA' + '9'.repeat(32) })
    expect(row.answeredAt).not.toBeNull()
    const logs = await prisma.activityLog.findMany({ where: { entityId: leadId, action: 'call.ended' } })
    expect(logs).toHaveLength(1)
    expect(logs[0]!.metadata).toMatchObject({ answered: true, durationSec: 95, status: 'COMPLETED' })
  })

  it('an unanswered call ends as no-answer with no talk time', async () => {
    const call = await newCall()
    await advanceCall(call.id, { status: 'RINGING' })
    await advanceCall(call.id, { status: 'NO_ANSWER' })
    await advanceCall(call.id, { status: 'COMPLETED', durationSec: 30 }) // can't change a finished call
    expect(await prisma.call.findUniqueOrThrow({ where: { id: call.id } })).toMatchObject({ status: 'NO_ANSWER', durationSec: 0, answeredAt: null })
  })

  it('stores the recording reference only from a signed callback', async () => {
    const call = await newCall()
    const params = { RecordingSid: 'RE' + 'a'.repeat(32), RecordingStatus: 'completed', RecordingDuration: '93' }
    expect((await recordingRoute.POST(signed('recording', params, `?callId=${call.id}`, 'nope'))).status).toBe(403)
    await recordingRoute.POST(signed('recording', params, `?callId=${call.id}`))
    expect(await prisma.call.findUniqueOrThrow({ where: { id: call.id } })).toMatchObject({ recordingSid: 'RE' + 'a'.repeat(32), recordingSec: 93, analysisStatus: 'pending' })
  })
})
