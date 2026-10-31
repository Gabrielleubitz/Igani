import { timingSafeEqual } from 'node:crypto'
import { splitDue } from '@/components/crm/crm-utils'
import { logActivity } from '@/lib/audit'
import { emailDataFor } from '@/lib/bookings'
import { appUrl } from '@/lib/env'
import { sendMeetingReminderEmail, sendTaskDigestEmail } from '@/lib/email'
import { formatDateTime, leadName } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { createAutoTask, loadTasks } from '@/lib/tasks'

export const dynamic = 'force-dynamic'

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const got = Buffer.from(req.headers.get('authorization') ?? '')
  const want = Buffer.from(`Bearer ${secret}`)
  return got.length === want.length && timingSafeEqual(got, want)
}

/** Calls that have ended get one auto follow-up task for the host (marked by `booking.ended`). */
async function createFollowUps(): Promise<number> {
  const ended = await prisma.booking.findMany({ where: { status: 'CONFIRMED', endTime: { lt: new Date() }, leadId: { not: null } }, orderBy: { endTime: 'desc' }, take: 200 })
  const done = new Set(
    (await prisma.activityLog.findMany({ where: { entityType: 'BOOKING', action: 'booking.ended', entityId: { in: ended.map((b) => b.id) } }, select: { entityId: true } })).map((l) => l.entityId),
  )
  let n = 0
  for (const b of ended.filter((x) => !done.has(x.id))) {
    await prisma.$transaction(async (tx) => {
      await logActivity({ entityType: 'BOOKING', entityId: b.id, action: 'booking.ended' }, tx)
      await createAutoTask({ leadId: b.leadId!, title: `Follow up after call: ${b.title}`, dueAt: new Date(Date.now() + 86_400_000), assigneeId: b.hostId, auto: 'follow-up', bookingId: b.id }, tx)
    })
    n++
  }
  return n
}

/** Guests of confirmed meetings starting in the next ~24h get one reminder (marked by `booking.reminder_sent`). */
async function sendMeetingReminders(): Promise<number> {
  if (!(await getSetting('reminders.meetingEmails'))) return 0
  const now = Date.now()
  const soon = await prisma.booking.findMany({
    where: { status: 'CONFIRMED', startTime: { gt: new Date(now + 2 * 3600_000), lte: new Date(now + 25 * 3600_000) } },
    select: { id: true, meetUrl: true, confirmedAt: true },
    take: 200,
  })
  const sent = new Set(
    (await prisma.activityLog.findMany({ where: { entityType: 'BOOKING', action: 'booking.reminder_sent', entityId: { in: soon.map((b) => b.id) } }, select: { entityId: true } })).map((l) => l.entityId),
  )
  let n = 0
  for (const b of soon) {
    // Skip meetings booked in the last few hours: the confirmation email is still fresh in their inbox.
    if (sent.has(b.id) || (b.confirmedAt && now - b.confirmedAt.getTime() < 6 * 3600_000)) continue
    try {
      const emailId = await sendMeetingReminderEmail({ ...(await emailDataFor(b.id)), meetUrl: b.meetUrl })
      await logActivity({ entityType: 'BOOKING', entityId: b.id, action: 'booking.reminder_sent', metadata: { emailId } })
      n++
    } catch (err) {
      console.error('[reminders] meeting reminder failed', b.id, err)
    }
  }
  return n
}

/**
 * Cron endpoint (hourly), public path in middleware but gated by the bearer secret (Vercel cron sends `Authorization: Bearer $CRON_SECRET`).
 * 1) creates follow-up tasks for calls that ended, 2) emails guests a reminder ~24h before confirmed meetings,
 * 3) emails each assignee one branded digest of tasks that are overdue / due today and not reminded yet,
 *    then logs `task.reminded` so nobody is emailed twice about the same task.
 */
export async function GET(req: Request): Promise<Response> {
  if (!authorised(req)) return new Response('Unauthorized', { status: 401 })
  const followUps = await createFollowUps()
  const meetingReminders = await sendMeetingReminders()
  const [tasks, remindedLogs] = await Promise.all([
    loadTasks(),
    prisma.activityLog.findMany({ where: { entityType: 'LEAD', action: 'task.reminded' }, select: { metadata: true } }),
  ])
  const reminded = new Set(remindedLogs.map((l) => (l.metadata as { taskId?: string } | null)?.taskId))
  const { overdue, today } = splitDue(tasks)
  const due = [...overdue, ...today].filter((t) => t.assigneeId && !reminded.has(t.id))

  const byUser = new Map<string, typeof due>()
  for (const t of due) byUser.set(t.assigneeId!, [...(byUser.get(t.assigneeId!) ?? []), t])
  const [users, leads] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: [...byUser.keys()] }, role: { not: null } }, select: { id: true, email: true, name: true, timeZone: true } }),
    prisma.lead.findMany({ where: { id: { in: [...new Set(due.map((t) => t.leadId))] } }, select: { id: true, email: true, firstName: true, lastName: true } }),
  ])
  const leadById = new Map(leads.map((l) => [l.id, l]))
  let sent = 0
  for (const u of users) {
    if (!u.email) continue
    const list = byUser.get(u.id) ?? []
    try {
      await sendTaskDigestEmail(u.email, {
        name: u.name?.split(' ')[0] ?? u.email,
        tasksUrl: appUrl('/sales/tasks'),
        tasks: list.map((t) => {
          const overdueNow = t.dueAt!.getTime() < Date.now()
          const lead = leadById.get(t.leadId)
          return {
            title: t.title,
            overdue: overdueNow,
            due: `${overdueNow ? 'Overdue · was due' : 'Due'} ${formatDateTime(t.dueAt!, u.timeZone)}`,
            url: appUrl(`/sales/leads/${t.leadId}`),
            contact: lead ? leadName(lead) : undefined,
          }
        }),
      })
    } catch (err) {
      console.error('[reminders] send failed', u.id, err)
      continue
    }
    sent++
    for (const t of list) await logActivity({ entityType: 'LEAD', entityId: t.leadId, action: 'task.reminded', metadata: { taskId: t.id } })
  }
  return Response.json({ checked: due.length, emailed: sent, followUps, meetingReminders })
}
