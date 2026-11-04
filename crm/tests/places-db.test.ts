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
// Google is never reached
const google = { places: [] as object[] }
vi.mock('@/lib/places', async (orig) => {
  const real = await orig<typeof import('@/lib/places')>()
  return { ...real, searchPlaces: async () => ({ places: google.places.map((p) => real.toPlaceResult(p as never)).filter(Boolean), nextPageToken: 'next' }) }
})

const d = testDb ? describe : describe.skip

d('find businesses → call list → lead', async () => {
  const { findBusinesses, addToCallList } = await import('@/app/actions/places')
  const { dialerCallLists, dialerProspects, makeProspectLead, deleteCallList } = await import('@/app/actions/call-lists')
  const { startCall, saveCallWrapUp } = await import('@/app/actions/calls')
  const prisma = new PrismaClient()
  let repId = ''
  let otherId = ''
  const asRep = (): void => {
    session.user = { id: repId, email: 'rep@igani.co', role: 'SALES', name: 'Rita' }
  }
  const asOther = (): void => {
    session.user = { id: otherId, email: 'sam@igani.co', role: 'SALES', name: 'Sam' }
  }
  const search = async () => {
    const r = await findBusinesses({ what: 'real estate', where: 'Jerusalem' })
    if (!r.ok) throw new Error(r.error)
    return r.data
  }
  const strip = (places: Awaited<ReturnType<typeof search>>['places']) => places.map(({ existing: _e, ...p }) => p)
  // what Twilio's status callback does when a call ends
  const ended = (callId: string) => prisma.call.update({ where: { id: callId }, data: { status: 'COMPLETED', endedAt: new Date() } })
  const clean = async (): Promise<void> => {
    await prisma.activityLog.deleteMany()
    await prisma.call.deleteMany()
    await prisma.phoneLine.deleteMany()
    await prisma.callList.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.leadNote.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
  }

  beforeEach(async () => {
    await clean()
    repId = (await prisma.user.create({ data: { email: 'rep@igani.co', name: 'Rita', role: 'SALES' } })).id
    otherId = (await prisma.user.create({ data: { email: 'sam@igani.co', name: 'Sam', role: 'SALES' } })).id
    await prisma.phoneLine.createMany({ data: [{ userId: repId, number: '+972531111111' }, { userId: otherId, number: '+972532222222' }] })
    asRep()
    google.places = [
      { id: 'p1', displayName: { text: 'Zion Realty' }, internationalPhoneNumber: '+972 2-123-4567', websiteUri: 'https://zion.co.il' },
      { id: 'p2', displayName: { text: 'Old City Homes' }, internationalPhoneNumber: '+972 50-765-4321' },
      { id: 'p3', displayName: { text: 'No Phone Ltd' }, websiteUri: 'https://www.nophone.co.il/x' },
    ]
  })
  afterAll(async () => {
    await clean()
    await prisma.$disconnect()
  })

  it('marks businesses that are already leads, without revealing someone else’s lead', async () => {
    await prisma.lead.create({ data: { company: 'Zion', phone: '02-1234567', assignedToId: otherId } })
    await prisma.lead.create({ data: { company: 'NP', website: 'http://nophone.co.il', assignedToId: repId } })
    const r = await search()
    expect(r.query).toBe('real estate in Jerusalem')
    const byId = Object.fromEntries(r.places.map((p) => [p.placeId, p.existing]))
    expect(byId.p1).toEqual({ kind: 'lead', id: null, owner: 'Sam' })
    expect(byId.p2).toBeNull()
    expect(byId.p3).toMatchObject({ kind: 'lead' })
    expect(await prisma.activityLog.count({ where: { action: 'places.search', actorId: repId } })).toBe(1)
  })

  it('puts new businesses on a call list (not leads), once', async () => {
    const r = await search()
    const first = await addToCallList({ query: r.query, places: strip(r.places), newList: { name: 'Real estate · Jerusalem' } })
    if (!first.ok) throw new Error(first.error)
    expect(first.data).toMatchObject({ added: 2, skipped: 1, listName: 'Real estate · Jerusalem' })
    expect(await prisma.lead.count()).toBe(0)
    const list = await prisma.callList.findUniqueOrThrow({ where: { id: first.data.listId }, include: { prospects: true } })
    expect(list.ownerId).toBe(repId)
    expect(list.prospects.map((p) => p.name).sort()).toEqual(['Old City Homes', 'Zion Realty'])
    // searching again shows them as on the list, and adding again adds nothing (even to another list)
    const again = await search()
    expect(again.places.find((p) => p.placeId === 'p2')?.existing).toMatchObject({ kind: 'list', listId: list.id, list: 'Real estate · Jerusalem', owner: null })
    const second = await addToCallList({ query: r.query, places: strip(again.places), newList: { name: 'Other' } })
    expect(second.ok && second.data.added).toBe(0)
    // a rep can't make a list for someone else
    expect((await addToCallList({ query: r.query, places: strip(r.places), newList: { name: 'X', ownerId: otherId } })).ok).toBe(false)
  })

  it('shows the list in the dialer; an interested call makes the business a lead with the call on it', async () => {
    const r = await search()
    const added = await addToCallList({ query: r.query, places: strip(r.places), newList: { name: 'RE' } })
    if (!added.ok) throw new Error(added.error)
    const lists = await dialerCallLists()
    expect(lists.ok && lists.data).toEqual([{ id: added.data.listId, name: 'RE', toCall: 2, total: 2, owner: null }])
    const open = await dialerProspects(added.data.listId)
    if (!open.ok) throw new Error(open.error)
    const zion = open.data.prospects.find((p) => p.name === 'Zion Realty')!

    // first call: no answer → still to call, tried once
    const c1 = await startCall({ to: zion.phone, prospectId: zion.id })
    if (!c1.ok) throw new Error(c1.error)
    await ended(c1.data.callId)
    expect(c1.data.prospect).toMatchObject({ id: zion.id, name: 'Zion Realty' })
    expect((await saveCallWrapUp({ callId: c1.data.callId, outcome: 'no_answer' })).ok).toBe(true)
    expect(await prisma.prospect.findUniqueOrThrow({ where: { id: zion.id } })).toMatchObject({ status: 'TO_CALL', attempts: 1, lastOutcome: 'no_answer' })
    expect(await prisma.lead.count()).toBe(0)

    // second call goes well
    const c2 = await startCall({ to: zion.phone, prospectId: zion.id })
    if (!c2.ok) throw new Error(c2.error)
    await ended(c2.data.callId)
    const w = await saveCallWrapUp({ callId: c2.data.callId, outcome: 'interested', notes: 'Wants a new site, call Sunday' })
    if (!w.ok) throw new Error(w.error)
    expect(w.data.madeLead).toBe(true)
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: w.data.leadId! } })
    expect(lead).toMatchObject({ company: 'Zion Realty', status: 'CONTACTED', assignedToId: repId, source: 'Google Places' })
    // both calls are on the lead now, and the prospect points at it
    expect(await prisma.call.count({ where: { leadId: lead.id } })).toBe(2)
    expect(await prisma.prospect.findUniqueOrThrow({ where: { id: zion.id } })).toMatchObject({ status: 'CONVERTED', leadId: lead.id, attempts: 2 })
    expect(await prisma.activityLog.count({ where: { entityId: lead.id, action: 'call.outcome' } })).toBe(1)
    const left = await dialerProspects(added.data.listId)
    expect(left.ok && left.data.prospects.map((p) => p.name)).toEqual(['Old City Homes'])

    // "interested" only makes sense for list calls
    const plain = await startCall({ to: '050-111-2233' })
    if (!plain.ok) throw new Error(plain.error)
    await ended(plain.data.callId)
    expect((await saveCallWrapUp({ callId: plain.data.callId, outcome: 'interested' })).ok).toBe(false)
  })

  it('"Make lead" links to an existing lead instead of duplicating, and lists are private', async () => {
    const r = await search()
    const added = await addToCallList({ query: r.query, places: strip(r.places), newList: { name: 'RE' } })
    if (!added.ok) throw new Error(added.error)
    const p2 = await prisma.prospect.findFirstOrThrow({ where: { listId: added.data.listId, name: 'Old City Homes' } })
    // someone added the same number as a lead in the meantime
    const existing = await prisma.lead.create({ data: { company: 'OCH', phone: '0507654321' } })
    const made = await makeProspectLead(p2.id)
    expect(made).toEqual({ ok: true, data: { leadId: existing.id, created: false } })
    expect(await makeProspectLead(p2.id)).toEqual({ ok: true, data: { leadId: existing.id, created: false } })
    expect(await prisma.lead.count()).toBe(1)

    asOther()
    expect((await dialerProspects(added.data.listId)).ok).toBe(false)
    expect((await dialerCallLists()).ok && (await dialerCallLists())).toEqual({ ok: true, data: [] })
    expect((await startCall({ to: p2.phone, prospectId: p2.id })).ok).toBe(false)
    expect((await deleteCallList(added.data.listId)).ok).toBe(false)
    asRep()
    expect((await deleteCallList(added.data.listId)).ok).toBe(true)
    // the lead it made stays
    expect(await prisma.lead.count()).toBe(1)
  })

  it('stops searching once the hourly allowance is used', async () => {
    await prisma.activityLog.createMany({ data: Array.from({ length: 40 }, () => ({ entityType: 'USER' as const, entityId: repId, actorId: repId, action: 'places.search' })) })
    expect((await findBusinesses({ what: 'real estate', where: 'Jerusalem' })).ok).toBe(false)
  })
})
