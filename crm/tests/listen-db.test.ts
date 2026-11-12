import { createHmac } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import twilio from 'twilio'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
const RELAY_SECRET = 'relay-secret-for-tests-1234'
Object.assign(process.env, {
  NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret',
  NEXT_PUBLIC_APP_URL: 'https://app.igani.co',
  TWILIO_ACCOUNT_SID: 'AC' + '1'.repeat(32),
  TWILIO_AUTH_TOKEN: 'auth-token-for-tests',
  TWILIO_API_KEY_SID: 'SK' + '2'.repeat(32),
  TWILIO_API_KEY_SECRET: 'api-key-secret',
  TWILIO_TWIML_APP_SID: 'AP' + '3'.repeat(32),
  LISTEN_RELAY_URL: 'wss://listen.test.igani.co',
  LISTEN_RELAY_SECRET: RELAY_SECRET,
})

type Role = 'ADMIN' | 'SALES'
const session = { user: null as null | { id: string; email: string; role: Role; name: string | null } }
vi.mock('@/lib/auth', async (orig) => ({
  ...(await orig<typeof import('@/lib/auth')>()),
  requireUser: async (roles?: readonly Role[]) => {
    if (!session.user) throw Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;/login' })
    if (roles && !roles.includes(session.user.role)) throw Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;/unauthorized' })
    return session.user
  },
  currentUserOrNull: async () => session.user,
}))

// Twilio's REST API is replaced: what we'd send is recorded, nothing goes out
const created: { callSid: string; params: Record<string, unknown> }[] = []
const stopped: { callSid: string; sid: string; status: string }[] = []
const twilioMock = { createFails: false }
vi.mock('@/lib/twilio', async (orig) => ({
  ...(await orig<typeof import('@/lib/twilio')>()),
  twilioClient: () => ({
    calls: (callSid: string) => {
      const streams = (sid: string) => ({
        update: async (p: { status: string }) => {
          stopped.push({ callSid, sid, status: p.status })
          return { sid, status: p.status }
        },
      })
      streams.create = async (params: Record<string, unknown>) => {
        if (twilioMock.createFails) throw new Error('Twilio says no')
        created.push({ callSid, params })
        return { sid: 'MZ' + 'c'.repeat(32) }
      }
      return { streams }
    },
  }),
}))

const d = testDb ? describe : describe.skip

d('listening in on live calls', async () => {
  const { startListen, stopListen } = await import('@/lib/listen')
  const { callNotes, liveCalls, listenStart, sendCallNote } = await import('@/app/actions/calls')
  const twimlRoute = await import('@/app/api/public/voice/twiml/route')
  const streamRoute = await import('@/app/api/public/voice/stream/route')
  const endedRoute = await import('@/app/api/public/listen/ended/route')
  const prisma = new PrismaClient()
  let adminId = ''
  let repId = ''
  let rep2Id = ''
  const admin = (): void => void (session.user = { id: adminId, email: 'boss@igani.co', role: 'ADMIN', name: 'Gabriel' })
  const rep = (): void => void (session.user = { id: repId, email: 'rep@igani.co', role: 'SALES', name: 'Rita' })
  const rep2 = (): void => void (session.user = { id: rep2Id, email: 'rep2@igani.co', role: 'SALES', name: 'Roni' })
  const sessionUser = () => session.user!

  const signed = (path: string, params: Record<string, string>, query = '') => {
    const url = `https://app.igani.co/api/public/voice/${path}${query}`
    const sig = twilio.getExpectedTwilioSignature('auth-token-for-tests', url, params)
    return new Request(url, { method: 'POST', body: new URLSearchParams(params).toString(), headers: { 'x-twilio-signature': sig, 'content-type': 'application/x-www-form-urlencoded' } })
  }
  const relayPost = (body: unknown, secret = RELAY_SECRET) => {
    const raw = JSON.stringify(body)
    return new Request('https://app.igani.co/api/public/listen/ended', { method: 'POST', body: raw, headers: { 'content-type': 'application/json', 'x-listen-signature': createHmac('sha256', secret).update(raw).digest('hex') } })
  }
  const liveCall = (over: object = {}) => prisma.call.create({ data: { userId: repId, direction: 'OUTBOUND', status: 'IN_PROGRESS', answeredAt: new Date(), fromNumber: '+972532222222', toNumber: '+972501234567', twilioCallSid: 'CA' + 'a'.repeat(32), ...over } })
  const setListenIn = (on: boolean) => prisma.siteSetting.upsert({ where: { key: 'voice.listenIn' }, create: { key: 'voice.listenIn', value: on }, update: { value: on } })

  beforeEach(async () => {
    created.length = 0
    stopped.length = 0
    twilioMock.createFails = false
    process.env.LISTEN_RELAY_URL = 'wss://listen.test.igani.co'
    process.env.LISTEN_RELAY_SECRET = RELAY_SECRET
    await prisma.callNote.deleteMany()
    await prisma.call.deleteMany()
    await prisma.phoneLine.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.siteSetting.deleteMany()
    adminId = (await prisma.user.create({ data: { email: 'boss@igani.co', name: 'Gabriel', role: 'ADMIN' } })).id
    repId = (await prisma.user.create({ data: { email: 'rep@igani.co', name: 'Rita', role: 'SALES' } })).id
    rep2Id = (await prisma.user.create({ data: { email: 'rep2@igani.co', name: 'Roni', role: 'SALES' } })).id
    await prisma.phoneLine.create({ data: { userId: adminId, number: '+972531111111' } })
    await prisma.phoneLine.create({ data: { userId: repId, number: '+972532222222' } })
    await setListenIn(true)
    admin()
  })
  afterAll(async () => {
    await prisma.callNote.deleteMany()
    await prisma.call.deleteMany()
    await prisma.phoneLine.deleteMany()
    await prisma.user.deleteMany()
    await prisma.siteSetting.deleteMany()
    await prisma.$disconnect()
  })

  it('refuses everything it should: non-admins, private, own, not connected, setting off, relay missing', async () => {
    const call = await liveCall()
    rep()
    await expect(startListen(sessionUser(), call.id)).rejects.toThrow(/Only admins/)
    await expect(listenStart(call.id)).rejects.toThrow() // the action itself turns non-admins away
    admin()
    const priv = await liveCall({ private: true, twilioCallSid: 'CA' + 'b'.repeat(32) })
    await expect(startListen(sessionUser(), priv.id)).rejects.toThrow(/private/)
    const mine = await liveCall({ userId: adminId, twilioCallSid: 'CA' + 'd'.repeat(32) })
    await expect(startListen(sessionUser(), mine.id)).rejects.toThrow(/your own/)
    const ringing = await liveCall({ status: 'RINGING', twilioCallSid: 'CA' + 'e'.repeat(32) })
    await expect(startListen(sessionUser(), ringing.id)).rejects.toThrow(/isn’t connected/)
    const noSid = await liveCall({ twilioCallSid: null })
    await expect(startListen(sessionUser(), noSid.id)).rejects.toThrow(/isn’t connected/)
    const over = await liveCall({ status: 'COMPLETED', twilioCallSid: 'CA' + 'f'.repeat(32) })
    await expect(startListen(sessionUser(), over.id)).rejects.toThrow(/isn’t connected/)
    await setListenIn(false)
    await expect(startListen(sessionUser(), call.id)).rejects.toThrow(/switched off/)
    await setListenIn(true)
    delete process.env.LISTEN_RELAY_URL
    await expect(startListen(sessionUser(), call.id)).rejects.toThrow(/relay/)
    expect(created).toEqual([])
    expect(await prisma.activityLog.count({ where: { action: 'call.listen.started' } })).toBe(0)
  })

  it('forks the audio to the relay once, with the right parameters, and hands the admin a token', async () => {
    const lead = await prisma.lead.create({ data: { email: 'dana@x.com', firstName: 'Dana', lastName: 'Levi', phone: '+972501234567', assignedToId: repId } })
    const call = await liveCall({ leadId: lead.id })
    const r = await listenStart(call.id)
    if (!r.ok) throw new Error(r.error)
    expect(r.data).toMatchObject({ relayUrl: 'wss://listen.test.igani.co', roles: { inbound: 'rep', outbound: 'client' }, rep: 'Rita', contact: 'Dana Levi' })
    // the listener token: HS256 JWT for this call, this admin, a couple of minutes to connect
    const [h, b, s] = r.data.token.split('.')
    expect(JSON.parse(Buffer.from(h!, 'base64url').toString())).toEqual({ alg: 'HS256', typ: 'JWT' })
    const claims = JSON.parse(Buffer.from(b!, 'base64url').toString()) as { callId: string; sub: string; exp: number; iat: number; roles: unknown }
    expect(claims).toMatchObject({ callId: call.id, sub: adminId, roles: { inbound: 'rep', outbound: 'client' } })
    expect(claims.exp - claims.iat).toBe(120)
    expect(s).toBe(createHmac('sha256', RELAY_SECRET).update(`${h}.${b}`).digest('base64url'))

    // the stream: on the parent leg, both tracks, status callback to us, and the token/callId/roles the relay checks
    expect(created).toHaveLength(1)
    expect(created[0]!.callSid).toBe('CA' + 'a'.repeat(32))
    const p = created[0]!.params
    expect(p).toMatchObject({ url: 'wss://listen.test.igani.co/twilio', name: `listen-${call.id}`, track: 'both_tracks', statusCallback: `https://app.igani.co/api/public/voice/stream?callId=${call.id}`, statusCallbackMethod: 'POST', 'parameter1.name': 'token', 'parameter2.name': 'callId', 'parameter2.value': call.id, 'parameter3.name': 'roles', 'parameter3.value': 'rep,client' })
    const [exp, mac] = String(p['parameter1.value']).split('.')
    expect(Number(exp)).toBeGreaterThan(Date.now() / 1000 + 60)
    expect(mac).toBe(createHmac('sha256', RELAY_SECRET).update(`${call.id}.${exp}`).digest('hex'))
    expect((await prisma.call.findUniqueOrThrow({ where: { id: call.id } })).listenStreamSid).toBe('MZ' + 'c'.repeat(32))

    // a second admin (or the same one again) reuses the stream; both listens are in the audit log
    const again = await listenStart(call.id)
    expect(again.ok).toBe(true)
    expect(created).toHaveLength(1)
    const logs = await prisma.activityLog.findMany({ where: { action: 'call.listen.started' } })
    expect(logs).toHaveLength(2)
    expect(logs[0]).toMatchObject({ actorId: adminId, entityType: 'USER', entityId: repId, metadata: { callId: call.id, rep: repId } })

    await stopListen(sessionUser(), call.id, 42.4)
    expect(await prisma.activityLog.findFirst({ where: { action: 'call.listen.stopped' } })).toMatchObject({ actorId: adminId, entityId: repId, metadata: { callId: call.id, seconds: 42 } })
  })

  it('an incoming call has the roles the other way round (the parent leg is the client’s phone)', async () => {
    const call = await liveCall({ direction: 'INBOUND', fromNumber: '+972501234567', toNumber: '+972532222222' })
    const r = await startListen(sessionUser(), call.id)
    expect(r.roles).toEqual({ inbound: 'client', outbound: 'rep' })
    expect(created[0]!.params['parameter3.value']).toBe('client,rep')
  })

  it('when Twilio refuses the stream, the call is untouched and the next try starts fresh', async () => {
    const call = await liveCall()
    twilioMock.createFails = true
    await expect(startListen(sessionUser(), call.id)).rejects.toThrow(/Twilio refused/)
    expect(await prisma.call.findUniqueOrThrow({ where: { id: call.id } })).toMatchObject({ status: 'IN_PROGRESS', listenStreamSid: null })
    twilioMock.createFails = false
    await startListen(sessionUser(), call.id)
    expect(created).toHaveLength(1)
  })

  it('the stream status callback forgets a stopped or failed stream (signed requests only)', async () => {
    const call = await liveCall({ listenStreamSid: 'MZ' + 'c'.repeat(32) })
    const unsigned = new Request(`https://app.igani.co/api/public/voice/stream?callId=${call.id}`, { method: 'POST', body: 'StreamEvent=stream-stopped', headers: { 'content-type': 'application/x-www-form-urlencoded' } })
    expect((await streamRoute.POST(unsigned)).status).toBe(403)
    // another stream's sid doesn't clear ours
    expect((await streamRoute.POST(signed('stream', { StreamEvent: 'stream-stopped', StreamSid: 'MZ' + '9'.repeat(32) }, `?callId=${call.id}`))).status).toBe(204)
    expect((await prisma.call.findUniqueOrThrow({ where: { id: call.id } })).listenStreamSid).toBe('MZ' + 'c'.repeat(32))
    expect((await streamRoute.POST(signed('stream', { StreamEvent: 'stream-started', StreamSid: 'MZ' + 'c'.repeat(32) }, `?callId=${call.id}`))).status).toBe(204)
    expect((await prisma.call.findUniqueOrThrow({ where: { id: call.id } })).listenStreamSid).toBe('MZ' + 'c'.repeat(32))
    expect((await streamRoute.POST(signed('stream', { StreamEvent: 'stream-stopped', StreamSid: 'MZ' + 'c'.repeat(32) }, `?callId=${call.id}`))).status).toBe(204)
    expect((await prisma.call.findUniqueOrThrow({ where: { id: call.id } })).listenStreamSid).toBeNull()
    const again = await liveCall({ listenStreamSid: 'MZ' + 'd'.repeat(32), twilioCallSid: 'CA' + 'b'.repeat(32) })
    await streamRoute.POST(signed('stream', { StreamEvent: 'stream-error', StreamSid: 'MZ' + 'd'.repeat(32), StreamError: 'boom' }, `?callId=${again.id}`))
    expect((await prisma.call.findUniqueOrThrow({ where: { id: again.id } })).listenStreamSid).toBeNull()
  })

  it('the relay’s “last listener left” stops the stream, only with a valid signature', async () => {
    const call = await liveCall({ listenStreamSid: 'MZ' + 'c'.repeat(32) })
    expect((await endedRoute.POST(relayPost({ callId: call.id, at: Date.now() }, 'wrong-secret-wrong-secret'))).status).toBe(403)
    const noSig = new Request('https://app.igani.co/api/public/listen/ended', { method: 'POST', body: JSON.stringify({ callId: call.id, at: Date.now() }) })
    expect((await endedRoute.POST(noSig)).status).toBe(403)
    expect((await endedRoute.POST(relayPost({ callId: call.id, at: Date.now() - 10 * 60_000 }))).status).toBe(400)
    expect(stopped).toEqual([])
    const ok = await endedRoute.POST(relayPost({ callId: call.id, at: Date.now() }))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ ok: true, stopped: true })
    expect(stopped).toEqual([{ callSid: 'CA' + 'a'.repeat(32), sid: 'MZ' + 'c'.repeat(32), status: 'stopped' }])
    expect((await prisma.call.findUniqueOrThrow({ where: { id: call.id } })).listenStreamSid).toBeNull()
    // nothing to stop any more: fine, and no second REST call
    expect(await (await endedRoute.POST(relayPost({ callId: call.id, at: Date.now() }))).json()).toEqual({ ok: true, stopped: false })
    expect(stopped).toHaveLength(1)
    delete process.env.LISTEN_RELAY_SECRET
    expect((await endedRoute.POST(relayPost({ callId: call.id, at: Date.now() }))).status).toBe(503)
  })

  it('notes: admins send them to live, non-private calls; the rep and admins read them, nobody else', async () => {
    const call = await liveCall()
    rep()
    await expect(sendCallNote(call.id, 'hi')).rejects.toThrow()
    admin()
    expect(await sendCallNote(call.id, '   ')).toMatchObject({ ok: false })
    expect(await sendCallNote(call.id, 'x'.repeat(201))).toMatchObject({ ok: false, error: /200/ })
    const priv = await liveCall({ private: true, userId: rep2Id, twilioCallSid: 'CA' + 'b'.repeat(32) })
    expect(await sendCallNote(priv.id, 'psst')).toMatchObject({ ok: false })
    const over = await liveCall({ status: 'COMPLETED', twilioCallSid: 'CA' + 'f'.repeat(32) })
    expect(await sendCallNote(over.id, 'too late')).toMatchObject({ ok: false, error: /ended/ })

    const sent = await sendCallNote(call.id, '  Ask about their timeline  ')
    if (!sent.ok) throw new Error(sent.error)
    expect(sent.data).toMatchObject({ body: 'Ask about their timeline', author: 'Gabriel' })
    expect(await prisma.activityLog.findFirst({ where: { action: 'call.note.sent' } })).toMatchObject({ actorId: adminId, entityId: repId, metadata: { callId: call.id, noteId: sent.data.id, rep: repId } })

    // the rep on the call sees it; another rep doesn't; an admin does
    rep()
    const mine = await callNotes(call.id, 0)
    if (!mine.ok) throw new Error(mine.error)
    expect(mine.data.live).toBe(true)
    expect(mine.data.notes.map((n) => n.body)).toEqual(['Ask about their timeline'])
    rep2()
    expect(await callNotes(call.id, 0)).toMatchObject({ ok: false })
    admin()
    expect((await callNotes(call.id, 0)) as { ok: true; data: { notes: unknown[] } }).toMatchObject({ ok: true })
    // nobody reads notes on a private call, not even its owner
    rep2()
    expect(await callNotes(priv.id, 0)).toMatchObject({ ok: false })

    // since: only what arrived after the last poll; live turns false once the call ends
    admin()
    const t = new Date(sent.data.createdAt).getTime()
    await new Promise((r) => setTimeout(r, 5))
    const second = await sendCallNote(call.id, 'Mention the deposit')
    if (!second.ok) throw new Error(second.error)
    rep()
    const later = await callNotes(call.id, t)
    if (!later.ok) throw new Error(later.error)
    expect(later.data.notes.map((n) => n.body)).toEqual(['Mention the deposit'])
    await prisma.call.update({ where: { id: call.id }, data: { status: 'COMPLETED' } })
    const after = await callNotes(call.id, new Date(second.data.createdAt).getTime())
    if (!after.ok) throw new Error(after.error)
    expect(after.data).toEqual({ notes: [], live: false })
  })

  it('Live now says which calls can be listened to', async () => {
    const other = await liveCall()
    const ringing = await liveCall({ status: 'RINGING', answeredAt: null, twilioCallSid: 'CA' + 'b'.repeat(32) })
    const mine = await liveCall({ userId: adminId, twilioCallSid: 'CA' + 'd'.repeat(32) })
    await liveCall({ private: true, userId: rep2Id, twilioCallSid: 'CA' + 'e'.repeat(32) }) // never listed
    const r = await liveCalls()
    if (!r.ok) throw new Error(r.error)
    expect(r.data).toMatchObject({ listenIn: true, listenReady: true })
    const by = Object.fromEntries(r.data.calls.map((c) => [c.callId, c.canListen]))
    expect(by).toEqual({ [other.id]: true, [ringing.id]: false, [mine.id]: false })
    await setListenIn(false)
    const off = await liveCalls()
    if (!off.ok) throw new Error(off.error)
    expect(off.data.listenIn).toBe(false)
    expect(off.data.calls.every((c) => !c.canListen)).toBe(true)
    await setListenIn(true)
    delete process.env.LISTEN_RELAY_SECRET
    const noRelay = await liveCalls()
    if (!noRelay.ok) throw new Error(noRelay.error)
    expect(noRelay.data.listenReady).toBe(false)
    expect(noRelay.data.calls.every((c) => !c.canListen)).toBe(true)
  })

  it('calls are placed the normal way whatever the setting: a plain bridge, never a conference room', async () => {
    const call = await prisma.call.create({ data: { userId: repId, direction: 'OUTBOUND', fromNumber: '+972532222222', toNumber: '+972501234567' } })
    const xml = await (await twimlRoute.POST(signed('twiml', { CallSid: 'CA' + 'a'.repeat(32), From: `client:u_${repId}`, callId: call.id }))).text()
    expect(xml).toContain('+972501234567</Number>')
    expect(xml).toContain('record="record-from-answer-dual"')
    expect(xml).toContain('answerOnBridge="true"')
    expect(xml).not.toContain('Conference')
    expect((await prisma.call.findUniqueOrThrow({ where: { id: call.id } })).conference).toBe(false)
    // an admin's old "listen" parameter is just an unknown call now
    const stray = await (await twimlRoute.POST(signed('twiml', { CallSid: 'CA' + 'b'.repeat(32), From: `client:u_${adminId}`, listen: call.id }))).text()
    expect(stray).toContain('<Hangup/>')
  })
})
