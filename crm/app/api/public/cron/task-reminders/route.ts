import { timingSafeEqual } from 'node:crypto'
import { foldTasks, splitDue } from '@/components/crm/crm-utils'
import { logActivity } from '@/lib/audit'
import { appUrl } from '@/lib/env'
import { sendTaskDigestEmail } from '@/lib/email'
import { prisma } from '@/lib/prisma'
import { createAutoTask } from '@/lib/tasks'

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

/**
 * Cron endpoint (hourly), public path in middleware but gated by the bearer secret (Vercel cron sends `Authorization: Bearer $CRON_SECRET`).
 * 1) creates follow-up tasks for calls that ended, 2) emails each assignee one branded digest of tasks that are
 * overdue / due today and not reminded yet, then logs `task.reminded` so nobody is emailed twice about the same task.
 */
export async function GET(req: Request): Promise<Response> {
  if (!authorised(req)) return new Response('Unauthorized', { status: 401 })
  const followUps = await createFollowUps()
  const logs = await prisma.activityLog.findMany({
    where: { entityType: 'LEAD', action: { in: ['task.created', 'task.completed', 'task.reminded'] } },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  })
  const reminded = new Set(logs.filter((l) => l.action === 'task.reminded').map((l) => (l.metadata as { taskId?: string } | null)?.taskId))
  const { overdue, today } = splitDue(foldTasks(logs))
  const due = [...overdue, ...today].filter((t) => t.assigneeId && !reminded.has(t.id))

  const byUser = new Map<string, typeof due>()
  for (const t of due) byUser.set(t.assigneeId!, [...(byUser.get(t.assigneeId!) ?? []), t])
  const users = await prisma.user.findMany({ where: { id: { in: [...byUser.keys()] } }, select: { id: true, email: true, name: true } })
  let sent = 0
  for (const u of users) {
    if (!u.email) continue
    const tasks = byUser.get(u.id) ?? []
    try {
      await sendTaskDigestEmail(u.email, {
        name: u.name ?? u.email,
        tasksUrl: appUrl('/sales/tasks'),
        tasks: tasks.map((t) => ({
          title: t.title,
          overdue: t.dueAt!.getTime() < Date.now(),
          due: t.dueAt!.getTime() < Date.now() ? 'Overdue' : `Due ${t.dueAt!.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
          url: appUrl(`/sales/leads/${t.leadId}`),
        })),
      })
    } catch (err) {
      console.error('[reminders] send failed', u.id, err)
      continue
    }
    sent++
    for (const t of tasks) await logActivity({ entityType: 'LEAD', entityId: t.leadId, action: 'task.reminded', metadata: { taskId: t.id } })
  }
  return Response.json({ checked: due.length, emailed: sent, followUps })
}
