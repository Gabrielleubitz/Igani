import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co' })

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }))
const session = { user: null as null | { id: string; email: string; role: 'ADMIN' | 'SALES'; name: string | null } }
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), requireUser: async () => session.user }))

const d = testDb ? describe : describe.skip

const ANALYSIS = {
  v: 3, isSalesCall: true, callType: 'Cold call', language: 'English', lang: 'en', summary: 'The rep booked a demo. Budget was ₪9,000.', outcome: { label: 'Demo booked', score: 70 }, sentiment: 'positive', nextStep: 'Demo Thursday', clientNeeds: ['A new site'], objections: [], actionItems: [],
  talkRatioRep: 50, questionsAsked: 6, overallScore: 70, scores: { opening: 4, discovery: 3, value: 3, objections: 3, closing: 4 },
  strengths: ['You asked a clear opening question.'], improvements: ['You pitched before asking what the site does.'],
  moments: [{ at: 18, step: 'intelligence', clientSaid: null, repSaid: 'x', better: 'What does the site do for you today?', why: 'Ask first.' }],
  focus: [{ skill: 'Questions', why: 'w', drill: 'Ask three questions first.', sayThis: 'Before I explain, what is the site for?' }],
}

d('coachStatus', async () => {
  const { coachStatus } = await import('@/app/actions/call-reviews')
  const prisma = new PrismaClient()
  let repId = ''
  let otherId = ''
  let adminId = ''
  const as = (id: string, role: 'ADMIN' | 'SALES'): void => {
    session.user = { id, email: `${id}@igani.co`, role, name: null }
  }
  const mk = (data: Record<string, unknown> = {}) =>
    prisma.call.create({ data: { userId: repId, direction: 'OUTBOUND', status: 'COMPLETED', fromNumber: '+972531111111', toNumber: '+972501234567', durationSec: 300, answeredAt: new Date(Date.now() - 400_000), startedAt: new Date(Date.now() - 420_000), endedAt: new Date(Date.now() - 120_000), ...data } as never })
  beforeEach(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.callShare.deleteMany()
    await prisma.call.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    repId = (await prisma.user.create({ data: { email: 'rita@igani.co', name: 'Rita', role: 'SALES' } })).id
    otherId = (await prisma.user.create({ data: { email: 'sam@igani.co', name: 'Sam', role: 'SALES' } })).id
    adminId = (await prisma.user.create({ data: { email: 'admin@igani.co', name: 'Admin', role: 'ADMIN' } })).id
    as(repId, 'SALES')
  })
  afterAll(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.callShare.deleteMany()
    await prisma.call.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  it('waits, then gives the coaching card when the review is ready (and never shows the budget)', async () => {
    const call = await mk()
    const waiting = await coachStatus(call.id)
    expect(waiting.ok && waiting.data.state).toBe('waiting')
    await prisma.call.update({ where: { id: call.id }, data: { analysisStatus: 'ready', analysis: ANALYSIS, analyzedAt: new Date() } })
    const ready = await coachStatus(call.id)
    if (!ready.ok) throw new Error(ready.error)
    expect(ready.data.state).toBe('ready')
    expect(ready.data.card).toMatchObject({ win: 'You asked a clear opening question.', fix: 'You pitched before asking what the site does.', say: 'Before I explain, what is the site for?', sparse: false })
    expect(ready.data.card?.verdict).toBe('The rep booked a demo.')
    expect(JSON.stringify(ready.data)).not.toMatch(/9,000|₪|budget/i)
  })

  it('names the lead', async () => {
    const lead = await prisma.lead.create({ data: { firstName: 'Dana', lastName: 'Levi', email: 'dana@acme.co', assignedToId: repId } })
    const call = await mk({ leadId: lead.id })
    const r = await coachStatus(call.id)
    expect(r.ok && r.data.name).toBe('Dana Levi')
  })

  it('is skipped at once for a short call, and honest for failed and late reviews', async () => {
    const short = await coachStatus((await mk({ durationSec: 80 })).id)
    expect(short.ok && short.data).toMatchObject({ state: 'skipped' })
    const failed = await coachStatus((await mk({ analysisStatus: 'failed', analysisAttempts: 3, analysisError: 'OpenAI is busy' })).id)
    expect(failed.ok && failed.data).toMatchObject({ state: 'failed', willRetry: false })
    const late = await coachStatus((await mk({ endedAt: new Date(Date.now() - 2 * 3600_000), startedAt: new Date(Date.now() - 2.2 * 3600_000) })).id)
    expect(late.ok && late.data.state).toBe('unavailable')
  })

  it('does not touch the analysis fields', async () => {
    const call = await mk({ analysisStatus: 'pending', analysisAttempts: 1 })
    await coachStatus(call.id)
    const after = await prisma.call.findUniqueOrThrow({ where: { id: call.id } })
    expect(after).toMatchObject({ analysisStatus: 'pending', analysisAttempts: 1, analysis: null })
  })

  it('shows nothing for another rep’s call, an admin’s view of it, a shared call, or a private call', async () => {
    const mine = await mk({ analysisStatus: 'ready', analysis: ANALYSIS })
    as(otherId, 'SALES')
    expect((await coachStatus(mine.id)).ok && ((await coachStatus(mine.id)) as { data: { state: string } }).data.state).toBe('none')
    await prisma.callShare.create({ data: { callId: mine.id, userId: otherId } })
    const shared = await coachStatus(mine.id)
    expect(shared.ok && shared.data).toEqual({ state: 'none', name: '' })
    as(adminId, 'ADMIN')
    const admin = await coachStatus(mine.id)
    expect(admin.ok && admin.data).toEqual({ state: 'none', name: '' })
    as(repId, 'SALES')
    const priv = await mk({ private: true, analysisStatus: 'ready', analysis: ANALYSIS })
    const p = await coachStatus(priv.id)
    expect(p.ok && p.data.state).toBe('none')
  })

  it('gives an admin the card for their own call', async () => {
    const call = await mk({ userId: adminId, analysisStatus: 'ready', analysis: ANALYSIS })
    as(adminId, 'ADMIN')
    const r = await coachStatus(call.id)
    expect(r.ok && r.data.state).toBe('ready')
  })

  it('answers none for a call that does not exist and rejects a bad id', async () => {
    const missing = await coachStatus('c' + 'a'.repeat(24))
    expect(missing.ok && missing.data.state).toBe('none')
    expect((await coachStatus('nope')).ok).toBe(false)
  })
})
