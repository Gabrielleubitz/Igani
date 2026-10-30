import Link from 'next/link'
import { CrmSubNav } from '@/components/crm/CrmSubNav'
import { CompleteTaskButton } from '@/components/crm/LeadNotesTasks'
import { foldTasks } from '@/components/crm/crm-utils'
import { Badge } from '@/components/ui/badge'
import { requireUser } from '@/lib/auth'
import { formatDateTime, leadName } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Tasks' }

export default async function TasksPage(): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN', 'SALES'])
  const isAdmin = user.role === 'ADMIN'
  const [logs, me] = await Promise.all([
    prisma.activityLog.findMany({
      where: { entityType: 'LEAD', action: { in: ['task.created', 'task.completed'] } },
      orderBy: { createdAt: 'desc' },
      take: 3000,
    }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
  ])
  const open = foldTasks(logs)
    .filter((t) => !t.done && (isAdmin || t.assigneeId === user.id))
    .sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity))
  const leads = await prisma.lead.findMany({
    where: { id: { in: [...new Set(open.map((t) => t.leadId))] } },
    select: { id: true, email: true, firstName: true, lastName: true, assignedToId: true },
  })
  const byId = new Map(leads.map((l) => [l.id, l]))
  const now = Date.now()

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Tasks &amp; reminders</h1>
      <CrmSubNav active="/sales/tasks" />
      {open.length === 0 ? <p className="text-sm text-muted-foreground">Nothing to do. Add tasks from a lead page.</p> : null}
      <div className="divide-y rounded-lg border">
        {open.map((t) => {
          const lead = byId.get(t.leadId)
          const overdue = t.dueAt !== null && t.dueAt.getTime() < now
          return (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div>
                <div className="font-medium">{t.title}</div>
                <div className="text-xs text-muted-foreground">
                  {lead ? <Link href={`/sales/leads/${lead.id}`} className="underline">{leadName(lead)}</Link> : 'lead removed'}
                  {t.dueAt ? ` · due ${formatDateTime(t.dueAt, me.timeZone)}` : ' · no due date'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {overdue ? <Badge variant="destructive">Overdue</Badge> : null}
                {lead && (isAdmin || lead.assignedToId === user.id) ? <CompleteTaskButton leadId={t.leadId} taskId={t.id} /> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
