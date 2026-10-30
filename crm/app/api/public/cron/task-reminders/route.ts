import { timingSafeEqual } from 'node:crypto'
import { Resend } from 'resend'
import { foldTasks, splitDue } from '@/components/crm/crm-utils'
import { logActivity } from '@/lib/audit'
import { appUrl, env } from '@/lib/env'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const got = Buffer.from(req.headers.get('authorization') ?? '')
  const want = Buffer.from(`Bearer ${secret}`)
  return got.length === want.length && timingSafeEqual(got, want)
}

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/**
 * Cron endpoint, public path in middleware but gated by the bearer secret (Vercel cron sends `Authorization: Bearer $CRON_SECRET`).
 * Emails each assignee one digest of tasks that are overdue / due today and not reminded yet,
 * then logs `task.reminded` so nobody is emailed twice about the same task.
 */
export async function GET(req: Request): Promise<Response> {
  if (!authorised(req)) return new Response('Unauthorized', { status: 401 })
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
  const client = new Resend(env().RESEND_API_KEY)
  let sent = 0
  for (const u of users) {
    if (!u.email) continue
    const tasks = byUser.get(u.id) ?? []
    const when = (t: (typeof tasks)[number]): string => (t.dueAt!.getTime() < Date.now() ? 'OVERDUE' : `due ${t.dueAt!.toISOString().slice(0, 16).replace('T', ' ')} UTC`)
    const lines = tasks.map((t) => `${t.title} — ${when(t)} — ${appUrl(`/sales/leads/${t.leadId}`)}`)
    const { error } = await client.emails.send({
      from: env().EMAIL_FROM,
      to: u.email,
      subject: `${tasks.length} CRM task${tasks.length === 1 ? '' : 's'} need attention`,
      text: `Hi ${u.name ?? ''},\n\n${lines.join('\n')}\n\nAll tasks: ${appUrl('/sales/tasks')}`,
      html: `<p>Hi ${esc(u.name ?? '')},</p><ul>${tasks.map((t) => `<li><a href="${appUrl(`/sales/leads/${t.leadId}`)}">${esc(t.title)}</a> — ${when(t)}</li>`).join('')}</ul><p><a href="${appUrl('/sales/tasks')}">Open tasks</a></p>`,
    })
    if (error) {
      console.error('[reminders] send failed', u.id, error.message)
      continue
    }
    sent++
    for (const t of tasks) await logActivity({ entityType: 'LEAD', entityId: t.leadId, action: 'task.reminded', metadata: { taskId: t.id } })
  }
  return Response.json({ checked: due.length, emailed: sent })
}
