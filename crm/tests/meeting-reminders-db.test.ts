import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
Object.assign(process.env, { NEXTAUTH_SECRET: 'test-secret-test-secret-test-secret', NEXT_PUBLIC_APP_URL: 'https://app.igani.co' })

// Every email to a guest goes through here: the hourly job must never call it; approving a reminder must.
const sentReminders: string[] = []
vi.mock('@/lib/email', async (orig) => ({
  ...(await orig<typeof import('@/lib/email')>()),
  sendMeetingReminderEmail: async (b: { guestEmail: string }) => {
    sentReminders.push(b.guestEmail)
    return 'email-1'
  },
}))
const session = { user: null as null | { id: string; email: string; role: 'ADMIN' | 'SALES'; name: string | null } }
vi.mock('@/lib/auth', async (orig) => ({ ...(await orig<typeof import('@/lib/auth')>()), requireUser: async () => session.user, currentUserOrNull: async () => session.user }))
vi.mock('next/cache', () => ({ revalidatePath: () => undefined }))

const d = testDb ? describe : describe.skip
const H = 3_600_000

d('meeting reminders wait for the host’s approval', async () => {
  const { draftMeetingReminders } = await import('@/lib/meeting-reminders')
  const { sendFollowUp, dismissFollowUp } = await import('@/app/actions/follow-ups')
  const { loadTasks } = await import('@/lib/tasks')
  const prisma = new PrismaClient()
  let hostId = ''
  let leadId = ''

  beforeEach(async () => {
    sentReminders.length = 0
    await prisma.followUpDraft.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    const host = await prisma.user.create({ data: { email: 'rep@igani.co', name: 'Gabriel', role: 'SALES', timeZone: 'Asia/Jerusalem' } })
    hostId = host.id
    session.user = { id: host.id, email: 'rep@igani.co', role: 'SALES', name: 'Gabriel' }
    leadId = (await prisma.lead.create({ data: { email: 'dana@x.com', firstName: 'Dana', assignedToId: hostId } })).id
  })
  afterAll(async () => {
    await prisma.followUpDraft.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.lead.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  const meeting = (inHours: number, over: object = {}) =>
    prisma.booking.create({
      data: {
        hostId,
        leadId,
        title: 'Website call',
        guestName: 'Dana',
        guestEmail: 'dana@x.com',
        startTime: new Date(Date.now() + inHours * H),
        endTime: new Date(Date.now() + (inHours + 0.5) * H),
        status: 'CONFIRMED',
        source: 'SALES_INVITE',
        confirmedAt: new Date(Date.now() - 48 * H),
        meetUrl: 'https://meet.example/abc',
        ...over,
      },
    })

  it('drafts one reminder for the host and sends nothing to the guest', async () => {
    const b = await meeting(20)
    expect(await draftMeetingReminders()).toBe(1)
    expect(await draftMeetingReminders()).toBe(0) // once per meeting
    expect(sentReminders).toEqual([])
    const draft = await prisma.followUpDraft.findFirstOrThrow({ where: { bookingId: b.id } })
    expect(draft).toMatchObject({ userId: hostId, kind: 'reminder', status: 'open' })
    expect((await loadTasks([leadId])).find((t) => t.id === draft.taskId)).toMatchObject({ assigneeId: hostId, done: false })
  })

  it('sends the branded reminder only when the host presses Send', async () => {
    const b = await meeting(20)
    await draftMeetingReminders()
    const draft = await prisma.followUpDraft.findFirstOrThrow({ where: { bookingId: b.id } })
    expect(await sendFollowUp(draft.id, { body: draft.body })).toEqual({ ok: true, data: undefined })
    expect(sentReminders).toEqual(['dana@x.com'])
    expect((await prisma.followUpDraft.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe('sent')
    expect((await loadTasks([leadId])).find((t) => t.id === draft.taskId)?.done).toBe(true)
    // no second send of the same draft
    expect((await sendFollowUp(draft.id, { body: draft.body })).ok).toBe(false)
    expect(sentReminders).toHaveLength(1)
  })

  it('never sends for a cancelled meeting, and drops reminders nobody sent', async () => {
    const b = await meeting(20)
    await draftMeetingReminders()
    const draft = await prisma.followUpDraft.findFirstOrThrow({ where: { bookingId: b.id } })
    await prisma.booking.update({ where: { id: b.id }, data: { status: 'CANCELLED' } })
    expect((await sendFollowUp(draft.id, { body: draft.body })).ok).toBe(false)
    expect(sentReminders).toEqual([])
    await draftMeetingReminders()
    expect((await prisma.followUpDraft.findUniqueOrThrow({ where: { id: draft.id } })).status).toBe('dismissed')
    expect((await loadTasks([leadId])).some((t) => t.id === draft.taskId)).toBe(false)
  })

  it('lets the host decline it, and leaves team meetings and switched-off settings alone', async () => {
    const b = await meeting(20)
    await draftMeetingReminders()
    const draft = await prisma.followUpDraft.findFirstOrThrow({ where: { bookingId: b.id } })
    expect((await dismissFollowUp(draft.id)).ok).toBe(true)
    expect(sentReminders).toEqual([])
    await meeting(21, { source: 'TEAM_MEETING' })
    await prisma.siteSetting.upsert({ where: { key: 'reminders.meetingEmails' }, create: { key: 'reminders.meetingEmails', value: false }, update: { value: false } })
    await meeting(22)
    expect(await draftMeetingReminders()).toBe(0)
    await prisma.siteSetting.deleteMany({ where: { key: 'reminders.meetingEmails' } })
  })
})
