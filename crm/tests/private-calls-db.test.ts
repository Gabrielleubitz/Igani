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
const session = { user: null as null | { id: string; email: string; role: 'ADMIN' | 'SALES'; name: string | null } }
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), requireUser: async () => session.user, currentUserOrNull: async () => session.user }))
const analysed: string[] = []
vi.mock('@/lib/call-analysis', async (orig) => ({ ...(await orig<typeof import('@/lib/call-analysis')>()), analyzeCall: async (id: string) => void analysed.push(id) }))

const d = testDb ? describe : describe.skip

d('private calls (admins, personal use)', async () => {
  const { startCall } = await import('@/app/actions/calls')
  const { relationToCall } = await import('@/lib/call-access-db')
  const twimlRoute = await import('@/app/api/public/voice/twiml/route')
  const recordingRoute = await import('@/app/api/public/voice/recording/route')
  const prisma = new PrismaClient()
  let adminId = ''
  let repId = ''

  const signed = (path: string, params: Record<string, string>, query = '') => {
    const url = `https://app.igani.co/api/public/voice/${path}${query}`
    const sig = twilio.getExpectedTwilioSignature('auth-token-for-tests', url, params)
    return new Request(url, { method: 'POST', body: new URLSearchParams(params).toString(), headers: { 'x-twilio-signature': sig, 'content-type': 'application/x-www-form-urlencoded' } })
  }

  beforeEach(async () => {
    analysed.length = 0
    await prisma.call.deleteMany()
    await prisma.phoneLine.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.siteSetting.deleteMany()
    await prisma.allowedUser.deleteMany()
    adminId = (await prisma.user.create({ data: { email: 'boss@igani.co', name: 'Gabriel', role: 'ADMIN' } })).id
    repId = (await prisma.user.create({ data: { email: 'rep@igani.co', name: 'Rita', role: 'SALES' } })).id
    await prisma.phoneLine.create({ data: { userId: adminId, number: '+972531111111' } })
    await prisma.phoneLine.create({ data: { userId: repId, number: '+972532222222' } })
    await prisma.lead.create({ data: { email: 'mom@x.com', firstName: 'Mom', phone: '+972501234567', assignedToId: adminId } })
    session.user = { id: adminId, email: 'boss@igani.co', role: 'ADMIN', name: 'Gabriel' }
  })
  afterAll(async () => {
    await prisma.call.deleteMany()
    await prisma.phoneLine.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  it('an admin’s private call has no contact, no recording and no hints', async () => {
    const r = await startCall({ to: '050-123-4567', private: true })
    if (!r.ok) throw new Error(r.error)
    expect(r.data).toMatchObject({ private: true, record: false, hints: false, lead: null })
    const row = await prisma.call.findUniqueOrThrow({ where: { id: r.data.callId } })
    // even though the number belongs to a contact, the call isn't tied to it
    expect(row).toMatchObject({ private: true, leadId: null, prospectId: null })
    const xml = await (await twimlRoute.POST(signed('twiml', { CallSid: 'CA' + 'a'.repeat(32), From: `client:u_${adminId}`, callId: row.id }))).text()
    expect(xml).toContain('+972501234567</Number>')
    expect(xml).not.toContain('record=')
  })

  it('a normal call is still recorded and tied to the contact', async () => {
    const r = await startCall({ to: '050-123-4567' })
    if (!r.ok) throw new Error(r.error)
    expect(r.data).toMatchObject({ private: false, record: true })
    expect((await prisma.call.findUniqueOrThrow({ where: { id: r.data.callId } })).leadId).not.toBeNull()
  })

  it('salespeople can’t make private calls', async () => {
    session.user = { id: repId, email: 'rep@igani.co', role: 'SALES', name: 'Rita' }
    const r = await startCall({ to: '050-123-4567', private: true })
    expect(r.ok).toBe(false)
    expect(await prisma.call.count()).toBe(0)
  })

  it('only its caller can open it, and a stray recording is never kept or reviewed', async () => {
    const call = await prisma.call.create({ data: { userId: adminId, direction: 'OUTBOUND', fromNumber: '+972531111111', toNumber: '+972501234567', private: true, status: 'COMPLETED', durationSec: 90 } })
    const otherAdmin = await prisma.user.create({ data: { email: 'admin2@igani.co', role: 'ADMIN' } })
    expect(await relationToCall({ id: adminId, role: 'ADMIN' }, call)).toBe('owner')
    expect(await relationToCall({ id: otherAdmin.id, role: 'ADMIN' }, call)).toBeNull()
    expect(await relationToCall({ id: repId, role: 'SALES' }, call)).toBeNull()
    await recordingRoute.POST(signed('recording', { RecordingSid: 'RE' + 'f'.repeat(32), RecordingStatus: 'completed', RecordingDuration: '90' }, `?callId=${call.id}`))
    expect(await prisma.call.findUniqueOrThrow({ where: { id: call.id } })).toMatchObject({ recordingSid: null, analysisStatus: null })
    expect(analysed).toEqual([])
  })
})
