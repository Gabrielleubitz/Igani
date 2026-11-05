import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co', GOOGLE_MAPS_API_KEY: 'test-key' })
// demo dialer: no Twilio
for (const k of ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_API_KEY_SID', 'TWILIO_API_KEY_SECRET', 'TWILIO_TWIML_APP_SID']) delete process.env[k]

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }))
const session = { user: null as null | { id: string; email: string; role: 'ADMIN' | 'SALES'; name: string | null } }
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), requireUser: async () => session.user, currentUserOrNull: async () => session.user }))
// Google is never reached: one listing, counted
const google = { calls: 0, places: [] as object[] }
vi.mock('@/lib/places', async (orig) => {
  const real = await orig<typeof import('@/lib/places')>()
  return {
    ...real,
    searchPlaces: async () => {
      google.calls++
      return { places: google.places.map((p) => real.toPlaceResult(p as never)).filter(Boolean), nextPageToken: null }
    },
  }
})

const d = testDb ? describe : describe.skip

d('caller ID: recognising numbers and naming contacts', async () => {
  const { identifyCaller, startCall, saveCallWrapUp, lookupIncoming } = await import('@/app/actions/calls')
  const { checkContactPhone, createLead } = await import('@/app/actions/leads')
  const { findExistingLead } = await import('@/lib/leads')
  const prisma = new PrismaClient()
  let repId = ''
  let otherId = ''
  const as = (id: string): void => {
    session.user = { id, email: id === repId ? 'rep@igani.co' : 'sam@igani.co', role: 'SALES', name: id === repId ? 'Rita' : 'Sam' }
  }
  const ended = (callId: string) => prisma.call.update({ where: { id: callId }, data: { status: 'COMPLETED', answeredAt: new Date(Date.now() - 60_000), endedAt: new Date() } })
  const who = async (n: string, lookup = false) => {
    const r = await identifyCaller(n, { lookup })
    if (!r.ok) throw new Error(r.error)
    return r.data!
  }
  const clean = async (): Promise<void> => {
    await prisma.activityLog.deleteMany()
    await prisma.call.deleteMany()
    await prisma.phoneLine.deleteMany()
    await prisma.callList.deleteMany()
    await prisma.phoneLabel.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.leadNote.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
  }

  beforeEach(async () => {
    await clean()
    google.calls = 0
    google.places = [{ id: 'g1', displayName: { text: 'Remax Tel Aviv' }, internationalPhoneNumber: '+972 3-555-1234', primaryTypeDisplayName: { text: 'Real estate agency' }, websiteUri: 'https://remax-ta.co.il' }]
    repId = (await prisma.user.create({ data: { email: 'rep@igani.co', name: 'Rita', role: 'SALES' } })).id
    otherId = (await prisma.user.create({ data: { email: 'sam@igani.co', name: 'Sam', role: 'SALES' } })).id
    await prisma.phoneLine.createMany({ data: [{ userId: repId, number: '+972531111111' }, { userId: otherId, number: '+972532222222' }] })
    as(repId)
  })
  afterAll(async () => {
    await clean()
    await prisma.$disconnect()
  })

  it('recognises a client however the number is typed, and never confuses landlines with mobiles', async () => {
    await prisma.lead.create({ data: { firstName: 'Dana', lastName: 'Levi', company: 'Zion Realty', phone: '02-1234567', assignedToId: repId } })
    for (const typed of ['+972 2-123-4567', '0212 34567', '00972-2-1234567']) {
      const w = await who(typed)
      expect(w.title).toBe('Dana Levi')
      expect(w.subtitle).toBe('Zion Realty · Your lead')
      expect(w.lead).toMatchObject({ mine: true, blocked: false })
    }
    expect((await who('052-1234567')).lead).toBeNull()
    expect(await findExistingLead(prisma, undefined, '+97221234567')).not.toBeNull()
    expect(await findExistingLead(prisma, undefined, '0521234567')).toBeNull()
    // the new-contact form refuses the duplicate and shows who it is
    const dup = await createLead({ phone: '+972 2 123 4567' })
    expect(dup.ok).toBe(false)
    const check = await checkContactPhone('+972 2 123 4567')
    expect(check.ok && check.data?.title).toBe('Dana Levi')
  })

  it('another rep’s client: says whose it is, hides the name, and blocks the call', async () => {
    await prisma.lead.create({ data: { firstName: 'Dana', company: 'Zion Realty', phone: '050-123-4567', assignedToId: otherId } })
    const w = await who('0501234567')
    expect(w.lead).toEqual({ id: null, name: null, company: 'Zion Realty', owner: 'Sam', mine: false, blocked: true })
    expect(w.title).toBe('Zion Realty')
    expect(w.subtitle).toBe('Sam’s lead')
    const r = await startCall({ to: '0501234567' })
    expect(r.ok).toBe(false)
  })

  it('a number from a call-list business’s website is recognised as that person at that business', async () => {
    const list = await prisma.callList.create({ data: { name: 'Realtors', ownerId: repId } })
    await prisma.prospect.create({ data: { listId: list.id, name: 'Zion Realty', phone: '+972 2-123-4567', details: { contacts: [{ name: 'Dana Levi', role: 'Owner', phone: '052-987-6543', email: null }], phones: ['+97237654321'] } } })
    expect(await who('052-987-6543')).toMatchObject({ title: 'Dana Levi (Owner)', subtitle: 'Zion Realty · On “Realtors”' })
    expect(await who('03-765-4321')).toMatchObject({ title: 'Zion Realty', subtitle: 'On “Realtors”' })
    // someone else's list stays private
    as(otherId)
    expect((await who('052-987-6543')).prospect).toBeNull()
  })

  it('labels an unknown number with its Google business (looked up once), then the rep names the person after the call', async () => {
    expect((await who('03-555-1234')).title).toBeNull() // no lookup asked: nothing
    const w = await who('03-555-1234', true)
    expect(w).toMatchObject({ title: 'Remax Tel Aviv', subtitle: 'Real estate agency · Google listing' })
    await who('+972 3 555 1234', true)
    expect(google.calls).toBe(1) // cached
    // a number Google doesn't list is remembered as a miss
    await who('03-555-9999', true)
    await who('03-555-9999', true)
    expect(google.calls).toBe(2)

    const started = await startCall({ to: '03-555-1234' })
    if (!started.ok) throw new Error(started.error)
    expect(started.data.lead).toMatchObject({ name: 'Remax Tel Aviv', company: 'Remax Tel Aviv', firstName: null })
    await ended(started.data.callId)
    const saved = await saveCallWrapUp({ callId: started.data.callId, outcome: 'connected', contact: { firstName: 'Yossi', lastName: 'Cohen', company: '' } })
    expect(saved.ok).toBe(true)
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: started.data.lead!.id } })
    expect(lead).toMatchObject({ firstName: 'Yossi', lastName: 'Cohen', company: 'Remax Tel Aviv', website: 'https://remax-ta.co.il' }) // blank company kept
    expect(await prisma.activityLog.count({ where: { entityId: lead.id, action: 'lead.edited' } })).toBe(1)
    expect((await who('03-555-1234')).title).toBe('Yossi Cohen')
  })

  it('an unknown caller the rep names becomes their contact, linked to the call', async () => {
    const call = await prisma.call.create({ data: { userId: repId, direction: 'INBOUND', status: 'COMPLETED', fromNumber: '+97235551234', toNumber: '+972531111111', answeredAt: new Date(), endedAt: new Date() } })
    const inc = await lookupIncoming(call.id)
    expect(inc.ok && inc.data.id?.title).toBe('Remax Tel Aviv')
    const r = await saveCallWrapUp({ callId: call.id, outcome: 'interested', contact: { firstName: 'Yossi', company: 'Remax Tel Aviv' } })
    if (!r.ok) throw new Error(r.error)
    expect(r.data.madeLead).toBe(true)
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: r.data.leadId! } })
    expect(lead).toMatchObject({ firstName: 'Yossi', company: 'Remax Tel Aviv', assignedToId: repId, status: 'INTERESTED', source: 'Phone call' })
    expect((await prisma.call.findUniqueOrThrow({ where: { id: call.id } })).leadId).toBe(lead.id)
    // a caller who is another rep's lead is never taken over
    await prisma.lead.create({ data: { firstName: 'Dana', phone: '050-123-4567', assignedToId: otherId } })
    const c2 = await prisma.call.create({ data: { userId: repId, direction: 'INBOUND', status: 'COMPLETED', fromNumber: '+972501234567', toNumber: '+972531111111' } })
    const r2 = await saveCallWrapUp({ callId: c2.id, outcome: 'connected', contact: { firstName: 'Hacker' } })
    expect(r2.ok && r2.data.leadId).toBeNull()
    expect(await prisma.lead.count({ where: { firstName: 'Hacker' } })).toBe(0)
  })
})
