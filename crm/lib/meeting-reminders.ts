import 'server-only'
import { logActivity } from './audit'
import { teamMeetingIds } from './bookings'
import { prisma } from './prisma'
import { getSetting } from './settings'
import { createAutoTask } from './tasks'

/**
 * Meeting reminders are never sent on their own: for each confirmed meeting with a contact in the next ~24h, the host
 * gets a reminder ready to approve on Today (Follow-ups ready). One per meeting (marked by `booking.reminder_drafted`).
 * A reminder nobody sent is dropped once the meeting starts or is cancelled.
 */
export async function draftMeetingReminders(): Promise<number> {
  const now = Date.now()
  // reminders that are no longer useful go away (meeting started, moved out, or cancelled)
  const stale = await prisma.followUpDraft.findMany({ where: { kind: 'reminder', status: 'open' }, select: { id: true, leadId: true, taskId: true, bookingId: true } })
  if (stale.length) {
    const live = new Set((await prisma.booking.findMany({ where: { id: { in: stale.map((d) => d.bookingId ?? '') }, status: 'CONFIRMED', startTime: { gt: new Date(now) } }, select: { id: true } })).map((b) => b.id))
    for (const d of stale.filter((x) => !x.bookingId || !live.has(x.bookingId))) {
      await prisma.$transaction(async (tx) => {
        await tx.followUpDraft.update({ where: { id: d.id }, data: { status: 'dismissed', closedAt: new Date() } })
        await logActivity({ entityType: 'LEAD', entityId: d.leadId, action: 'task.deleted', metadata: { taskId: d.taskId } }, tx)
      })
    }
  }
  if (!(await getSetting('reminders.meetingEmails'))) return 0
  const soon = await prisma.booking.findMany({
    where: { status: 'CONFIRMED', source: { not: 'TEAM_MEETING' }, leadId: { not: null }, startTime: { gt: new Date(now + 2 * 3600_000), lte: new Date(now + 25 * 3600_000) } },
    select: { id: true, leadId: true, hostId: true, title: true, startTime: true, guestName: true, meetUrl: true, confirmedAt: true, host: { select: { timeZone: true } } },
    take: 200,
  })
  const done = new Set((await prisma.activityLog.findMany({ where: { entityType: 'BOOKING', action: { in: ['booking.reminder_sent', 'booking.reminder_drafted'] }, entityId: { in: soon.map((b) => b.id) } }, select: { entityId: true } })).map((l) => l.entityId))
  // Internal team calls have no client to remind.
  const team = await teamMeetingIds(soon.map((b) => b.id))
  let n = 0
  for (const b of soon) {
    if (team.has(b.id) || done.has(b.id)) continue
    // Booked in the last few hours: the confirmation email is still fresh in their inbox.
    if (b.confirmedAt && now - b.confirmedAt.getTime() < 6 * 3600_000) continue
    const when = new Intl.DateTimeFormat('en-GB', { timeZone: b.host.timeZone || 'Asia/Jerusalem', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(b.startTime)
    await prisma.$transaction(async (tx) => {
      await logActivity({ entityType: 'BOOKING', entityId: b.id, action: 'booking.reminder_drafted' }, tx)
      const taskId = await createAutoTask({ leadId: b.leadId!, title: `Send ${b.guestName} a reminder for ${when}`, dueAt: new Date(now), assigneeId: b.hostId, auto: 'follow-up-draft', bookingId: b.id }, tx)
      await tx.followUpDraft.create({
        data: {
          leadId: b.leadId!,
          userId: b.hostId,
          taskId,
          bookingId: b.id,
          kind: 'reminder',
          channel: 'email',
          subject: `Reminder: ${b.title}`,
          body: `Igani's reminder email for “${b.title}” on ${when}${b.meetUrl ? ', with the Meet link' : ''}, to ${b.guestName}.`,
          reason: `Meeting on ${when}. Send ${b.guestName} the reminder?`,
        },
      })
    })
    n++
  }
  return n
}
