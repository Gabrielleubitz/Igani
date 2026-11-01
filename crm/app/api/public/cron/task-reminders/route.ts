import { timingSafeEqual } from 'node:crypto'
import { splitDue } from '@/components/crm/crm-utils'
import { logActivity } from '@/lib/audit'
import { cancelBooking, emailDataFor } from '@/lib/bookings'
import { appUrl } from '@/lib/env'
import { sendMeetingReminderEmail, sendTaskDigestEmail } from '@/lib/email'
import { formatDateTime, leadName } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { createAutoTask, loadTasks, taskOwner } from '@/lib/tasks'
import { localHour } from '@/lib/time'
import { syncAllMailboxes } from '@/lib/mail-sync'
import { syncDueMeetings } from '@/lib/meetings'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const got = Buffer.from(req.headers.get('authorization') ?? '')
  const want = Buffer.from(`Bearer ${secret}`)
  return got.length === want.length && timingSafeEqual(got, want)
}

/** Calls that ended in the last 3 days get one auto follow-up task for the host (marked by `booking.ended`). */
async function createFollowUps(): Promise<number> {
  const now = Date.now()
  const ended = await prisma.booking.findMany({
    where: { status: 'CONFIRMED', endTime: { lt: new Date(now), gte: new Date(now - 3 * 86_400_000) }, leadId: { not: null } },
    orderBy: { endTime: 'desc' },
    take: 200,
  })
  const done = new Set(
    (await prisma.activityLog.findMany({ where: { entityType: 'BOOKING', action: 'booking.ended', entityId: { in: ended.map((b) => b.id) } }, select: { entityId: true } })).map((l) => l.entityId),
  )
  let n = 0
  for (const b of ended.filter((x) => !done.has(x.id))) {
    await prisma.$transaction(async (tx) => {
      await logActivity({ entityType: 'BOOKING', entityId: b.id, action: 'booking.ended' }, tx)
      await createAutoTask({ leadId: b.leadId!, title: `Follow up after call: ${b.title}`, dueAt: new Date(now + 86_400_000), assigneeId: b.hostId, auto: 'follow-up', bookingId: b.id }, tx)
    })
    n++
  }
  return n
}

/**
 * Requests nobody approved before their start time are closed: public-page requests are declined (the guest is
 * emailed with a link to pick a new time); sales invites the guest never confirmed are withdrawn quietly.
 */
async function expireStalePending(): Promise<number> {
  const stale = await prisma.booking.findMany({ where: { status: 'PENDING', startTime: { lte: new Date() } }, select: { id: true, source: true }, take: 200 })
  for (const b of stale) {
    await cancelBooking(b.id, null, b.source === 'PUBLIC_PAGE' ? 'expired-unapproved' : 'invite-not-confirmed', false).catch((err: unknown) => console.error('[cron] expire failed', b.id, err))
  }
  return stale.length
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
 * 3) closes requests whose time passed without approval, 4) emails each person (assignee, or the contact owner
 *    for unassigned tasks) one digest of tasks overdue / due today in THEIR time zone, during their daytime,
 *    logging `task.reminded` per (task, due date) so nobody is emailed twice about the same thing.
 */
export async function GET(req: Request): Promise<Response> {
  if (!authorised(req)) return new Response('Unauthorized', { status: 401 })
  // One run at a time: overlapping runs (retries, manual triggers) must not double-create tasks or emails.
  // A lease row (not a session advisory lock, which breaks with pooled connections); it expires after 10 minutes.
  const got = await prisma.$queryRaw<{ key: string }[]>`
    INSERT INTO "SiteSetting" (key, value, "updatedAt") VALUES ('cron.lock', '"reminders"'::jsonb, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = now()
    WHERE "SiteSetting"."updatedAt" < now() - interval '10 minutes'
    RETURNING key`
  if (got.length === 0) return Response.json({ skipped: 'another run is in progress' })
  try {
    return Response.json(await run())
  } finally {
    await prisma.siteSetting.deleteMany({ where: { key: 'cron.lock' } })
  }
}

/** Task digests go out between 7:00 and 20:00 in each person's own time zone (never in the middle of the night). */
const DIGEST_HOURS = { from: 7, to: 20 }

async function run(): Promise<Record<string, number>> {
  // Pull new client emails from every connected Gmail (failures are recorded per mailbox, never block the rest).
  const mail = await syncAllMailboxes().catch((err: unknown) => {
    console.error('[cron] mail sync failed', err)
    return { mailboxes: 0, stored: 0, failed: 1 }
  })
  // Google Meet calls scheduled from the CRM: real start/end + Gemini notes (failures are per call, never block the rest).
  const meet = await syncDueMeetings({ limit: 100 }).catch((err: unknown) => {
    console.error('[cron] meeting sync failed', err)
    return { checked: 0, failed: 1 }
  })
  const followUps = await createFollowUps()
  const expired = await expireStalePending()
  const meetingReminders = await sendMeetingReminders()

  // Only tasks on contacts that still exist and aren't archived.
  const leads = await prisma.lead.findMany({ where: { archived: false }, select: { id: true, assignedToId: true, email: true, phone: true, firstName: true, lastName: true, company: true } })
  const leadById = new Map(leads.map((l) => [l.id, l]))
  const tasks = (await loadTasks()).filter((t) => !t.done && t.dueAt && leadById.has(t.leadId))
  // A reminder covers one (task, due date) pair: rescheduling or reopening a task makes it eligible again.
  const remindedLogs = await prisma.activityLog.findMany({ where: { entityType: 'LEAD', action: 'task.reminded', createdAt: { gte: new Date(Date.now() - 120 * 86_400_000) } }, select: { metadata: true } })
  const reminded = new Set(remindedLogs.map((l) => { const m = (l.metadata ?? {}) as { taskId?: string; dueAt?: string }; return `${m.taskId}|${m.dueAt ?? ''}` }))

  const byUser = new Map<string, typeof tasks>()
  for (const t of tasks) {
    const owner = taskOwner(t, leadById.get(t.leadId)?.assignedToId)
    if (!owner || reminded.has(`${t.id}|${t.dueAt!.toISOString()}`)) continue
    byUser.set(owner, [...(byUser.get(owner) ?? []), t])
  }
  const users = await prisma.user.findMany({ where: { id: { in: [...byUser.keys()] }, role: { not: null } }, select: { id: true, email: true, name: true, timeZone: true } })
  const now = new Date()
  let sent = 0
  let checked = 0
  for (const u of users) {
    if (!u.email) continue
    const hour = localHour(now, u.timeZone)
    if (hour < DIGEST_HOURS.from || hour >= DIGEST_HOURS.to) continue
    const { overdue, today } = splitDue(byUser.get(u.id) ?? [], now, u.timeZone)
    const list = [...overdue, ...today]
    checked += list.length
    if (list.length === 0) continue
    try {
      await sendTaskDigestEmail(u.email, {
        name: u.name?.split(' ')[0] ?? u.email,
        tasksUrl: appUrl('/sales/tasks'),
        tasks: list.map((t) => {
          const overdueNow = t.dueAt!.getTime() < now.getTime()
          const lead = leadById.get(t.leadId)
          return {
            title: t.title,
            overdue: overdueNow,
            due: `${overdueNow ? 'Overdue since' : 'Due'} ${formatDateTime(t.dueAt!, u.timeZone)}`,
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
    for (const t of list) await logActivity({ entityType: 'LEAD', entityId: t.leadId, action: 'task.reminded', metadata: { taskId: t.id, dueAt: t.dueAt!.toISOString() } })
  }
  return { checked, emailed: sent, followUps, meetingReminders, expired, emailsSynced: mail.stored, mailboxErrors: mail.failed, meetingsChecked: meet.checked, meetingErrors: meet.failed }
}
