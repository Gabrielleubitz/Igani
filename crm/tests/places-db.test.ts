import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co', GOOGLE_MAPS_API_KEY: 'test-key' })

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

d('find businesses: search and import', async () => {
  const { findBusinesses, importBusinesses } = await import('@/app/actions/places')
  const prisma = new PrismaClient()
  let repId = ''
  let otherId = ''

  beforeEach(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.call.deleteMany()
    await prisma.phoneLine.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    repId = (await prisma.user.create({ data: { email: 'rep@igani.co', name: 'Rita', role: 'SALES' } })).id
    otherId = (await prisma.user.create({ data: { email: 'sam@igani.co', name: 'Sam', role: 'SALES' } })).id
    session.user = { id: repId, email: 'rep@igani.co', role: 'SALES', name: 'Rita' }
    google.places = [
      { id: 'p1', displayName: { text: 'Zion Realty' }, internationalPhoneNumber: '+972 2-123-4567', websiteUri: 'https://zion.co.il' },
      { id: 'p2', displayName: { text: 'Old City Homes' }, internationalPhoneNumber: '+972 50-765-4321' },
      { id: 'p3', displayName: { text: 'No Phone Ltd' }, websiteUri: 'https://www.nophone.co.il/x' },
    ]
  })
  afterAll(async () => {
    await prisma.activityLog.deleteMany()
    await prisma.call.deleteMany()
    await prisma.phoneLine.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  it('marks businesses that are already leads, without revealing someone else’s lead', async () => {
    await prisma.lead.create({ data: { company: 'Zion', phone: '02-1234567', assignedToId: otherId } })
    await prisma.lead.create({ data: { company: 'NP', website: 'http://nophone.co.il', assignedToId: repId } })
    const r = await findBusinesses({ what: 'real estate', where: 'Jerusalem' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.data.query).toBe('real estate in Jerusalem')
    const byId = Object.fromEntries(r.data.places.map((p) => [p.placeId, p.existing]))
    expect(byId.p1).toEqual({ id: null, owner: 'Sam' })
    expect(byId.p2).toBeNull()
    expect(byId.p3?.id).toBeTruthy()
    expect(await prisma.activityLog.count({ where: { action: 'places.search', actorId: repId } })).toBe(1)
  })

  it('imports new businesses as the rep’s leads and skips duplicates and ones without a phone', async () => {
    const r = await findBusinesses({ what: 'real estate', where: 'Jerusalem' })
    if (!r.ok) throw new Error(r.error)
    const places = r.data.places.map(({ existing: _e, ...p }) => p)
    const first = await importBusinesses({ query: r.data.query, places })
    expect(first).toEqual({ ok: true, data: { added: 2, skipped: 1 } })
    const leads = await prisma.lead.findMany({ orderBy: { company: 'asc' } })
    expect(leads.map((l) => l.company)).toEqual(['Old City Homes', 'Zion Realty'])
    expect(leads.every((l) => l.source === 'Google Places' && l.assignedToId === repId && l.tags.includes('google-places'))).toBe(true)
    // running it again adds nothing
    expect(await importBusinesses({ query: r.data.query, places })).toEqual({ ok: true, data: { added: 0, skipped: 3 } })
  })

  it('stops searching once the hourly allowance is used', async () => {
    await prisma.activityLog.createMany({ data: Array.from({ length: 40 }, () => ({ entityType: 'USER' as const, entityId: repId, actorId: repId, action: 'places.search' })) })
    const r = await findBusinesses({ what: 'real estate', where: 'Jerusalem' })
    expect(r.ok).toBe(false)
  })
})
