/** Gmail sync: parsing helpers (always run) + the full sync against a fake mailbox (needs TEST_DATABASE_URL). */
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { extractBody, parseAddressList, stripQuoted } from '@/lib/mail-parse'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
vi.mock('@/lib/google', () => ({ GmailNotConnectedError: class extends Error {}, gmailForUser: async () => ({}), hasGmailAccess: async () => true }))

const b64 = (s: string): string => Buffer.from(s).toString('base64url')

describe('mail parsing', () => {
  it('parses address lists with names, quotes and commas', () => {
    expect(parseAddressList('"Levi, Dana" <Dana@Acme.com>, bob@x.co, Noa <noa@igani.co>')).toEqual([
      { email: 'dana@acme.com', name: 'Levi, Dana' },
      { email: 'bob@x.co', name: null },
      { email: 'noa@igani.co', name: 'Noa' },
    ])
    expect(parseAddressList(undefined)).toEqual([])
  })
  it('prefers text/plain, falls back to HTML, skips attachments', () => {
    expect(extractBody({ mimeType: 'multipart/alternative', parts: [{ mimeType: 'text/plain', body: { data: b64('Hello plain') } }, { mimeType: 'text/html', body: { data: b64('<p>Hello html</p>') } }] })).toBe('Hello plain')
    expect(extractBody({ mimeType: 'multipart/mixed', parts: [{ mimeType: 'text/html', body: { data: b64('<div>Hi&nbsp;there<br>Line 2</div><style>x{}</style>') } }, { mimeType: 'text/plain', filename: 'a.txt', body: { data: b64('attachment') } }] })).toBe('Hi there\nLine 2')
  })
  it('removes quoted history (Gmail, Outlook, > lines)', () => {
    expect(stripQuoted('Sounds good!\n\nOn Mon, Nov 2, 2026 at 9:00 AM Gabriel <g@igani.co> wrote:\n> old text')).toBe('Sounds good!')
    expect(stripQuoted('Yes please\n\nFrom: Gabriel\nSent: Monday\nTo: Dana\nold')).toBe('Yes please')
    expect(stripQuoted('Thanks\n> quoted\nBye')).toBe('Thanks\nBye')
  })
})

const d = testDb ? describe : describe.skip

d('syncMailbox', async () => {
  const { syncMailbox } = await import('@/lib/mail-sync')
  const prisma = new PrismaClient()
  type Msg = { id: string; from: string; to: string; subject: string; body: string; mid?: string; labels?: string[] }
  const fake = (msgs: Msg[]) => ({
    list: async () => ({ ids: msgs.map((m) => m.id) }),
    get: async (id: string) => {
      const m = msgs.find((x) => x.id === id)!
      return {
        id,
        threadId: `t-${id}`,
        labelIds: m.labels ?? ['INBOX'],
        internalDate: String(Date.parse('2026-11-01T10:00:00Z')),
        snippet: m.body.slice(0, 50),
        payload: {
          headers: [
            { name: 'From', value: m.from },
            { name: 'To', value: m.to },
            { name: 'Subject', value: m.subject },
            ...(m.mid ? [{ name: 'Message-ID', value: m.mid }] : []),
          ],
          mimeType: 'text/plain',
          body: { data: b64(m.body) },
        },
      }
    },
  })
  beforeEach(async () => {
    await prisma.emailMessage.deleteMany()
    await prisma.mailboxSync.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
  })
  afterAll(async () => prisma.$disconnect())

  it('files only emails with known contacts, both directions, once, and logs them', async () => {
    const rep = await prisma.user.create({ data: { email: 'noa@igani.co', name: 'Noa', role: 'SALES' } })
    const lead = await prisma.lead.create({ data: { email: 'dana@acme.com', firstName: 'Dana' } })
    const msgs: Msg[] = [
      { id: 'm1', from: 'Dana <dana@acme.com>', to: 'noa@igani.co', subject: 'Re: Your proposal', body: 'Looks great!\n\nOn Mon Noa wrote:\n> proposal', mid: '<a1@acme.com>' },
      { id: 'm2', from: 'Noa <noa@igani.co>', to: 'dana@acme.com', subject: 'Contract', body: 'Attached the contract.', mid: '<b2@igani.co>' },
      { id: 'm3', from: 'newsletter@shop.com', to: 'noa@igani.co', subject: 'Sale!', body: 'Buy now' },
      { id: 'm4', from: 'dana@acme.com', to: 'noa@igani.co', subject: 'Draft', body: 'x', labels: ['DRAFT'] },
    ]
    const r1 = await syncMailbox(rep.id, { api: fake(msgs) })
    expect(r1).toMatchObject({ stored: 2, inbound: 1 })
    const rows = await prisma.emailMessage.findMany({ where: { leadId: lead.id }, orderBy: { direction: 'asc' } })
    expect(rows.map((r) => [r.direction, r.subject, r.bodyText])).toEqual([
      ['INBOUND', 'Re: Your proposal', 'Looks great!'],
      ['OUTBOUND', 'Contract', 'Attached the contract.'],
    ])
    expect(await prisma.emailMessage.count()).toBe(2) // the newsletter was never stored
    const acts = await prisma.activityLog.findMany({ where: { entityId: lead.id }, select: { action: true, actorId: true } })
    expect(acts).toEqual(expect.arrayContaining([{ action: 'email.received', actorId: null }, { action: 'email.sent', actorId: rep.id }]))

    const r2 = await syncMailbox(rep.id, { api: fake(msgs) })
    expect(r2.stored).toBe(0)
    expect((await prisma.mailboxSync.findUniqueOrThrow({ where: { userId: rep.id } })).lastSyncedAt).not.toBeNull()
  })

  it('stores an email seen in two teammates\' mailboxes once (same Message-ID)', async () => {
    const a = await prisma.user.create({ data: { email: 'a@igani.co', role: 'SALES' } })
    const b = await prisma.user.create({ data: { email: 'b@igani.co', role: 'SALES' } })
    await prisma.lead.create({ data: { email: 'dana@acme.com' } })
    const msg = (id: string): Msg => ({ id, from: 'dana@acme.com', to: 'a@igani.co, b@igani.co', subject: 'Hi both', body: 'Hello', mid: '<same@acme.com>' })
    await syncMailbox(a.id, { api: fake([msg('x1')]) })
    await syncMailbox(b.id, { api: fake([msg('y9')]) })
    expect(await prisma.emailMessage.count()).toBe(1)
  })
})
