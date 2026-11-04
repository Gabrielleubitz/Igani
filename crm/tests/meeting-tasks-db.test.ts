/** Meeting action items -> tasks against a real DB (needs TEST_DATABASE_URL). */
import { PrismaClient } from '@prisma/client'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'

const testDb = process.env.TEST_DATABASE_URL
if (testDb) process.env.DATABASE_URL = testDb
const d = testDb ? describe : describe.skip

d('meeting tasks', async () => {
  const prisma = new PrismaClient()
  const { getMeetingActionItems, createMeetingTasks, loadMeetingTasks, setMeetingTaskDone, backfillMeetingTasks } = await import('@/lib/meeting-tasks')
  beforeEach(async () => {
    await prisma.meetingSession.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.user.deleteMany()
  })
  afterAll(async () => {
    // other DB test files share this database and run next: leave no bookings/users behind
    await prisma.meetingSession.deleteMany()
    await prisma.activityLog.deleteMany()
    await prisma.booking.deleteMany()
    await prisma.user.deleteMany()
    await prisma.$disconnect()
  })

  async function seed() {
    const a = await prisma.user.create({ data: { email: 'dana@igani.co', name: 'Dana Cohen', role: 'ADMIN' } })
    const b = await prisma.user.create({ data: { email: 'gabriel@igani.co', name: 'Gabriel L', role: 'SALES' } })
    const c = await prisma.user.create({ data: { email: 'other@igani.co', name: 'Other', role: 'SALES' } })
    const bk = await prisma.booking.create({ data: { status: 'CONFIRMED', source: 'TEAM_MEETING', meetUrl: 'https://meet.google.com/abc-defg-hij', startTime: new Date('2026-10-30T10:00:00Z'), endTime: new Date('2026-10-30T10:30:00Z'), title: 'Weekly sync', guestName: 'Team', guestEmail: 'dana@igani.co', attendees: ['dana@igani.co', 'gabriel@igani.co'], hostId: a.id, createdById: a.id } })
    await prisma.meetingSession.create({ data: { bookingId: bk.id, meetingCode: 'abc-defg-hij', notesStatus: 'READY', fullText: 'Next steps\n- Gabriel: send the proposal\n- Review the deck\n' } })
    return { a, b, c, bk }
  }

  it('a call booked with "Book meeting with team" gets its tasks too, for the teammates invited', async () => {
    const host = await prisma.user.create({ data: { email: 'gabrielleubitz@igani.co', name: 'Gabriel', role: 'ADMIN' } })
    const rita = await prisma.user.create({ data: { email: 'rep@igani.co', name: 'Rita Rep', role: 'SALES' } })
    // booked from the CRM form: an ordinary invite tagged as a team meeting, teammates kept in the activity log
    const bk = await prisma.booking.create({ data: { status: 'CONFIRMED', source: 'SALES_INVITE', meetUrl: 'https://meet.google.com/xyz-abcd-efg', startTime: new Date('2026-11-03T10:00:00Z'), endTime: new Date('2026-11-03T10:30:00Z'), title: 'Team call', guestName: 'Rita Rep', guestEmail: 'rep@igani.co', hostId: host.id, createdById: host.id } })
    await prisma.activityLog.create({ data: { entityType: 'BOOKING', entityId: bk.id, action: 'booking.team_meeting', actorId: host.id } })
    await prisma.activityLog.create({ data: { entityType: 'BOOKING', entityId: bk.id, action: 'booking.teammates', actorId: host.id, metadata: { userIds: [rita.id] } } })
    // Gemini writes full Google names
    await prisma.meetingSession.create({ data: { bookingId: bk.id, meetingCode: 'xyz-abcd-efg', notesStatus: 'READY', fullText: 'Next steps\n- [Gabriel Leubitz] Send the deck\n- [Rita Rep] Call Honey Ltd\n' } })
    expect(await createMeetingTasks(bk.id)).toBe(2)
    expect((await loadMeetingTasks(rita.id)).map((t) => t.title)).toEqual(['Call Honey Ltd']) // visible to her, not hidden
    expect((await loadMeetingTasks(host.id)).map((t) => t.title)).toEqual(['Send the deck'])
    expect(await createMeetingTasks(bk.id)).toBe(0) // only once
    expect(await backfillMeetingTasks()).toBe(0)
  })

  it('creates once, on the right people; a second call is a no-op', async () => {
    const { a, b, bk } = await seed()
    expect(await createMeetingTasks(bk.id)).toBe(2)
    expect(await createMeetingTasks(bk.id)).toBe(0)
    const tasks = await loadMeetingTasks()
    expect(tasks.map((t) => [t.assigneeId, t.title]).sort()).toEqual([[a.id, 'Review the deck'], [b.id, 'Send the proposal']].sort())
    expect((await loadMeetingTasks(b.id))).toHaveLength(1)
  })

  it('owner or admin can tick; another user is rejected', async () => {
    const { a, b, c, bk } = await seed()
    await createMeetingTasks(bk.id)
    const t = (await loadMeetingTasks(b.id))[0]!
    await expect(setMeetingTaskDone({ id: c.id, role: 'SALES' }, b.id, t.id, true)).rejects.toThrow('Not your task.')
    await setMeetingTaskDone({ id: b.id, role: 'SALES' }, b.id, t.id, true)
    expect((await loadMeetingTasks(b.id))[0]!.done).toBe(true)
    await setMeetingTaskDone({ id: a.id, role: 'ADMIN' }, b.id, t.id, false)
    expect((await loadMeetingTasks(b.id))[0]!.done).toBe(false)
  })

  it('backfill creates tasks for already-pulled meetings, once', async () => {
    const { bk } = await seed()
    expect(await backfillMeetingTasks()).toBe(2)
    expect(await backfillMeetingTasks()).toBe(0)
    expect(await createMeetingTasks(bk.id)).toBe(0)
  })

  it('fetches items per teammate plus follow-ups for outsiders', async () => {
    const { a, b, bk } = await seed()
    await prisma.meetingSession.update({ where: { bookingId: bk.id }, data: { fullText: 'Next steps\n- Gabriel: send the proposal\n- Review the deck\n- Sarah: sign the contract\n' } })
    expect(await createMeetingTasks(bk.id)).toBe(2)
    const r = await getMeetingActionItems(bk.id)
    expect(r!.team.map((t) => [t.personId, t.items.map((i) => i.title)]).sort()).toEqual([[a.id, ['Review the deck']], [b.id, ['Send the proposal']]].sort())
    expect(r!.followUps).toEqual([{ who: 'Sarah', title: 'Sign the contract' }])
  })

  it('a teammate who was not in the meeting gets no task and sees nothing of it', async () => {
    const { c, bk } = await seed()
    await prisma.meetingSession.update({ where: { bookingId: bk.id }, data: { fullText: 'Next steps\n- Other: do the thing\n- Review the deck\n' } })
    await createMeetingTasks(bk.id)
    expect(await loadMeetingTasks(c.id)).toHaveLength(0)
    const r = await getMeetingActionItems(bk.id)
    expect(r!.team.some((t) => t.personId === c.id)).toBe(false)
    expect(r!.followUps).toEqual([{ who: 'Other', title: 'Do the thing' }])
  })
  it('hides old meeting tasks already given to a non-attendee (everywhere), keeps attendees', async () => {
    const { b, c, bk } = await seed()
    const { logActivity } = await import('@/lib/audit')
    for (const [u, id] of [[c.id, 't-old'], [b.id, 't-ok']] as const) {
      await logActivity({ entityType: 'USER', entityId: u, action: 'task.created', metadata: { taskId: id, title: 'Old', dueAt: null, assigneeId: u, priority: 'MEDIUM', auto: 'meeting', bookingId: bk.id, meetingTitle: 'Weekly sync' } })
    }
    expect(await loadMeetingTasks(c.id)).toHaveLength(0)
    expect((await loadMeetingTasks()).map((t) => t.id)).toEqual(['t-ok'])
    expect(await loadMeetingTasks(b.id)).toHaveLength(1)
  })
})
