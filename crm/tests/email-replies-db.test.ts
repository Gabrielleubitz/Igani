/** Emails sent from the CRM wait for an answer: a reminder task, closed by itself when the reply syncs in. */
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co' })

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }))
vi.mock('@/lib/google', async (orig) => ({ ...(await orig<typeof import('@/lib/google')>()), gmailForUser: async () => ({}), hasGmailAccess: async () => true }))
// nothing is really sent
let sentCount = 0
vi.mock('@/lib/email', async (orig) => ({ ...(await orig<typeof import('@/lib/email')>()), sendContactEmail: async () => `em_${++sentCount}` }))
const session = { user: null as null | { id: string; email: string; role: 'ADMIN' | 'SALES'; name: string | null } }
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), requireUser: async () => session.user, currentUserOrNull: async () => session.user }))

const d = testDb ? describe : describe.skip
const b64 = (s: string): string => Buffer.from(s).toString('base64url')

d('waiting for a reply', async () => {
  const { emailContact } = await import('@/app/sales/actions')
  const { syncMailbox } = await import('@/lib/mail-sync')
  const { loadTasks } = await import('@/lib/tasks')
  const prisma = new PrismaClient()
  let repId = ''
  let leadId = ''
  const inbox = (at: Date) => ({
    list: async () => ({ ids: ['r1'] }),
    get: async (id: string) => ({
      id,
      threadId: 't1',
      labelIds: ['INBOX'],
      internalDate: String(at.getTime()),
      snippet: 'Sounds good',
      payload: { headers: [{ name: 'From', value: 'Dana <dana@acme.com>' }, { name: 'To', value: 'noa@igani.co' }, { name: 'Subject', value: 'Re: Your website' }, { name: 'Message-ID', value: '<r1@acme.com>' }], mimeType: 'text/plain', body: { data: b64('Sounds good, call me Sunday') } },
    }),
  })
  const clean = async (): Promise<void> => {
    await prisma.emailMessage.deleteMany()
    await prisma.mailboxSync.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.call.deleteMany()
    await prisma.phoneLine.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
  }
  beforeEach(async () => {
    await clean()
    repId = (await prisma.user.create({ data: { email: 'noa@igani.co', name: 'Noa', role: 'SALES' } })).id
    leadId = (await prisma.lead.create({ data: { email: 'dana@acme.com', firstName: 'Dana', company: 'Acme', assignedToId: repId } })).id
    session.user = { id: repId, email: 'noa@igani.co', role: 'SALES', name: 'Noa' }
  })
  afterAll(async () => {
    await clean()
    await prisma.$disconnect()
  })

  it('sends, logs it, and sets a reminder that closes when they reply', async () => {
    const r = await emailContact(leadId, { subject: 'Your website', body: 'Hi Dana, here is the idea…', followUpDays: 3 })
    expect(r).toEqual({ ok: true, data: undefined })
    const sent = await prisma.emailMessage.findFirstOrThrow({ where: { leadId } })
    expect(sent.direction).toBe('OUTBOUND')
    expect(sent.repliedAt).toBeNull()
    const days = (sent.followUpAt!.getTime() - sent.sentAt.getTime()) / 86_400_000
    expect(Math.round(days)).toBe(3)
    expect(await prisma.activityLog.count({ where: { entityId: leadId, action: 'email.sent' } })).toBe(1)
    const task = (await loadTasks([leadId])).find((t) => t.id === sent.followUpTaskId)!
    expect(task).toMatchObject({ done: false, auto: 'email-reply', assigneeId: repId })
    expect(task.title).toContain('No reply from Dana yet')

    // their answer arrives in Noa's Gmail
    const res = await syncMailbox(repId, { api: inbox(new Date(Date.now() + 60_000)) })
    expect(res.inbound).toBe(1)
    expect((await prisma.emailMessage.findUniqueOrThrow({ where: { id: sent.id } })).repliedAt).not.toBeNull()
    expect((await loadTasks([leadId])).find((t) => t.id === sent.followUpTaskId)?.done).toBe(true)
    expect(await prisma.activityLog.count({ where: { entityId: leadId, action: 'email.received' } })).toBe(1)
  })

  it('an older email from them doesn’t count as the reply; no reminder when you don’t want one', async () => {
    await emailContact(leadId, { subject: 'Your website', body: 'Hi', followUpDays: 3 })
    await syncMailbox(repId, { api: inbox(new Date(Date.now() - 86_400_000)) })
    const sent = await prisma.emailMessage.findFirstOrThrow({ where: { leadId, direction: 'OUTBOUND' } })
    expect(sent.repliedAt).toBeNull()
    expect((await loadTasks([leadId])).find((t) => t.id === sent.followUpTaskId)?.done).toBe(false)

    await emailContact(leadId, { subject: 'Quick one', body: 'Hi', followUpDays: 0 })
    const quick = await prisma.emailMessage.findFirstOrThrow({ where: { leadId, subject: 'Quick one' } })
    expect(quick.followUpTaskId).toBeNull()
    expect((await emailContact(leadId, { subject: 'x', body: 'y', followUpDays: 4 as never })).ok).toBe(false)
  })
})
