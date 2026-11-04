import { PrismaClient } from '@prisma/client'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co', OPENAI_API_KEY: 'sk-test' })

// Twilio and OpenAI are never reached: the recording comes from a stub, OpenAI from a mocked fetch
vi.mock('@/lib/call-recording', () => ({
  ensureRecordingSid: async () => 'RE' + 'a'.repeat(32),
  fetchRecordingAudio: async () => new Response(new Blob([new Uint8Array(2048)], { type: 'audio/mpeg' })),
}))
const session = { user: null as null | { id: string; email: string; role: 'ADMIN' | 'SALES'; name: string | null } }
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), currentUserOrNull: async () => session.user }))

const analysis = {
  isSalesCall: true,
  callType: 'Discovery call',
  language: 'Hebrew',
  summary: 'Dana wants online booking for her studio. Price came up. A demo was booked for Sunday.',
  outcome: { label: 'Meeting booked', score: 140 }, // out of range: clamped to 100
  sentiment: 'positive',
  nextStep: 'Demo on Sunday at 10:00',
  clientNeeds: ['Online booking', 'Fewer no-shows'],
  objections: [{ objection: 'Price', response: 'Explained the monthly plan', handledWell: true }],
  actionItems: [{ owner: 'rep', text: 'Send the demo invite' }],
  talkRatioRep: 48,
  questionsAsked: 7,
  scores: { opening: 4, discovery: 5, value: 4, objections: 3, closing: 9 }, // 9 → 5
  overallScore: 82,
  strengths: ['Asked about their current tools'],
  improvements: ['Confirm the decision maker earlier'],
  moments: [{ at: 42.4, clientSaid: 'It sounds expensive', repSaid: 'It is what it is', better: 'Let me show you what it saves you each month', why: 'Reframes price as value.' }],
}

const d = testDb ? describe : describe.skip

d('call analysis', async () => {
  const { analyzeCall, asAnalysis } = await import('@/lib/call-analysis')
  const recordingRoute = await import('@/app/api/calls/[id]/recording/route')
  const prisma = new PrismaClient()
  let userId = ''
  let leadId = ''
  let openaiCalls = 0

  beforeEach(async () => {
    openaiCalls = 0
    vi.stubGlobal('fetch', async (url: string) => {
      openaiCalls++
      if (String(url).includes('/audio/transcriptions'))
        return Response.json({ text: 'שלום דנה', segments: [{ start: 0, end: 4, text: 'שלום דנה, מדבר גבריאל מאיגני' }, { start: 4, end: 9, text: 'היי, כן, חיכיתי' }, { start: 40, end: 45, text: 'It sounds expensive' }] })
      if (String(url).includes('/chat/completions')) return Response.json({ choices: [{ message: { content: JSON.stringify({ speakers: ['rep', 'client', 'client'], analysis }) } }] })
      return new Response('unexpected', { status: 500 })
    })
    await prisma.call.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    userId = (await prisma.user.create({ data: { email: 'rep@igani.co', name: 'Gabriel', role: 'SALES' } })).id
    leadId = (await prisma.lead.create({ data: { email: 'dana@x.com', firstName: 'Dana', phone: '0501234567' } })).id
  })
  afterEach(() => vi.unstubAllGlobals())
  afterAll(async () => {
    await prisma.call.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  const recorded = (over: object = {}) => prisma.call.create({ data: { userId, leadId, direction: 'OUTBOUND', status: 'COMPLETED', fromNumber: '+972531111111', toNumber: '+972501234567', durationSec: 60, recordingSid: 'RE' + 'a'.repeat(32), recordingSec: 60, analysisStatus: 'pending', ...over } })

  it('transcribes, labels speakers, analyses (values clamped) and puts a summary on the lead, once', async () => {
    const call = await recorded()
    expect(await analyzeCall(call.id)).toBe('ready')
    const row = await prisma.call.findUniqueOrThrow({ where: { id: call.id } })
    expect(row.analysisStatus).toBe('ready')
    const a = asAnalysis(row.analysis)!
    expect(a.outcome.score).toBe(100)
    expect(a.scores.closing).toBe(5)
    expect(a.moments[0]!.at).toBe(42)
    expect((row.transcript as { speaker: string }[]).map((l) => l.speaker)).toEqual(['rep', 'client', 'client'])
    expect(await prisma.activityLog.count({ where: { entityId: leadId, action: 'call.analyzed' } })).toBe(1)
    // a second run (cron, webhook retry) does nothing
    expect(await analyzeCall(call.id)).toBe('busy')
    expect(openaiCalls).toBe(2)
  })

  it('skips recordings too short to coach, and gives up after three failed attempts', async () => {
    const short = await recorded({ recordingSec: 6 })
    expect(await analyzeCall(short.id)).toBe('skipped')
    expect(openaiCalls).toBe(0)
    vi.stubGlobal('fetch', async () => new Response('down', { status: 503 }))
    const bad = await recorded()
    for (let i = 0; i < 3; i++) expect(await analyzeCall(bad.id)).toBe('failed')
    expect(await analyzeCall(bad.id)).toBe('busy') // no fourth attempt on its own
    expect((await prisma.call.findUniqueOrThrow({ where: { id: bad.id } })).analysisError).toMatch(/Transcription failed/)
  })

  it('the recording is only for the caller and admins', async () => {
    const call = await recorded()
    const get = () => recordingRoute.GET(new Request(`https://app.igani.co/api/calls/${call.id}/recording`), { params: Promise.resolve({ id: call.id }) })
    session.user = null
    expect((await get()).status).toBe(401)
    session.user = { id: 'cmother00000000000000000', email: 'other@igani.co', role: 'SALES', name: 'Other' }
    expect((await get()).status).toBe(404)
    session.user = { id: userId, email: 'rep@igani.co', role: 'SALES', name: 'Gabriel' }
    const own = await get()
    expect(own.status).toBe(200)
    expect(own.headers.get('content-type')).toBe('audio/mpeg')
    expect(own.headers.get('cache-control')).toContain('no-store')
    // seeking: a byte range comes back as 206 even though Twilio ignores Range
    const ranged = await recordingRoute.GET(new Request(`https://app.igani.co/api/calls/${call.id}/recording`, { headers: { range: 'bytes=100-199' } }), { params: Promise.resolve({ id: call.id }) })
    expect(ranged.status).toBe(206)
    expect(ranged.headers.get('content-range')).toBe('bytes 100-199/2048')
    expect((await ranged.arrayBuffer()).byteLength).toBe(100)
    session.user = { id: 'cmadmin00000000000000000', email: 'boss@igani.co', role: 'ADMIN', name: 'Boss' }
    expect((await get()).status).toBe(200)
  })
})
