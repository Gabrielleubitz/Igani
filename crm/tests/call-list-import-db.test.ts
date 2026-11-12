import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co' })

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }))
const session = { user: null as null | { id: string; email: string; role: 'ADMIN' | 'SALES'; name: string | null } }
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), requireUser: async () => session.user, currentUserOrNull: async () => session.user }))

const d = testDb ? describe : describe.skip

d('import a CSV into a call list', async () => {
  const { importCsvToCallList, dialerCallLists } = await import('@/app/actions/call-lists')
  const prisma = new PrismaClient()
  let adminId = ''
  let ritaId = ''
  let samId = ''
  const as = (id: string, role: 'ADMIN' | 'SALES', name: string): void => {
    session.user = { id, email: `${name.toLowerCase()}@igani.co`, role, name }
  }
  const clean = async (): Promise<void> => {
    await prisma.activityLog.deleteMany()
    await prisma.callList.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.booking.deleteMany() // meetings left by earlier test files would block deleting their hosts
    await prisma.user.deleteMany()
  }
  beforeEach(async () => {
    await clean()
    adminId = (await prisma.user.create({ data: { email: 'admin@igani.co', name: 'Admin', role: 'ADMIN' } })).id
    ritaId = (await prisma.user.create({ data: { email: 'rita@igani.co', name: 'Rita', role: 'SALES' } })).id
    samId = (await prisma.user.create({ data: { email: 'sam@igani.co', name: 'Sam', role: 'SALES' } })).id
    as(ritaId, 'SALES', 'Rita')
  })
  afterAll(async () => {
    await clean()
    await prisma.$disconnect()
  })
  const csv = 'name,phone,company\nDana,050-123-4567,Acme\nYoni,052-765-4321,Bluebird\nDana again,+972 50 123 4567,Acme\nBad,nope,\n'

  it('adds new numbers to a new list owned by the uploader, skipping repeats and bad rows', async () => {
    const r = await importCsvToCallList({ text: csv, newList: { name: 'November' } })
    if (!r.ok) throw new Error(r.error)
    expect(r.data).toMatchObject({ added: 2, alreadyLead: 0, alreadyOnList: 0, duplicatesInFile: 1, rejectedCount: 1 })
    const list = await prisma.callList.findUniqueOrThrow({ where: { id: r.data.listId }, include: { prospects: true } })
    expect(list.ownerId).toBe(ritaId)
    expect(list.prospects.map((p) => p.phone).sort()).toEqual(['+972501234567', '+972527654321'])
  })

  it('skips numbers that are already a lead (anyone’s) or already on a call list', async () => {
    await prisma.lead.create({ data: { company: 'Acme', phone: '050-1234567', assignedToId: samId } })
    const first = await importCsvToCallList({ text: 'phone\n052-765-4321', newList: { name: 'One' } })
    expect(first.ok && first.data.added).toBe(1)
    const r = await importCsvToCallList({ text: csv, newList: { name: 'Two' } })
    if (!r.ok) throw new Error(r.error)
    expect(r.data).toMatchObject({ added: 0, alreadyLead: 1, alreadyOnList: 1 })
  })

  it('only an admin can give a new list to someone else, and that salesperson alone sees it', async () => {
    const denied = await importCsvToCallList({ text: csv, newList: { name: 'Mine', ownerId: samId } })
    expect(denied.ok).toBe(false)
    as(adminId, 'ADMIN', 'Admin')
    const r = await importCsvToCallList({ text: csv, newList: { name: 'For Sam', ownerId: samId } })
    expect(r.ok && r.data.added).toBe(2)
    as(samId, 'SALES', 'Sam')
    const sam = await dialerCallLists()
    expect(sam.ok && sam.data.map((l) => l.name)).toEqual(['For Sam'])
    as(ritaId, 'SALES', 'Rita')
    const rita = await dialerCallLists()
    expect(rita.ok && rita.data).toEqual([])
  })

  it('adds to one of your own lists but not to someone else’s', async () => {
    const mine = await importCsvToCallList({ text: 'phone\n050-123-4567', newList: { name: 'Mine' } })
    if (!mine.ok) throw new Error(mine.error)
    const more = await importCsvToCallList({ text: 'phone\n052-765-4321', listId: mine.data.listId })
    expect(more.ok && more.data.added).toBe(1)
    as(samId, 'SALES', 'Sam')
    const sneaky = await importCsvToCallList({ text: 'phone\n053-111-2222', listId: mine.data.listId })
    expect(sneaky.ok).toBe(false)
  })

  it('explains a file with nothing usable', async () => {
    const r = await importCsvToCallList({ text: 'name,phone\nA,nope', newList: { name: 'X' } })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/None of the 1 rows/)
  })
})
