import Link from 'next/link'
import { CompleteTaskButton } from '@/components/crm/LeadNotesTasks'
import { TASK_PRIORITIES, foldTasks } from '@/components/crm/crm-utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { requireUser } from '@/lib/auth'
import { formatDateTime, leadName } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Tasks' }

export default async function TasksPage({ searchParams }: { searchParams: Record<string, string | undefined> }): Promise<React.ReactElement> {
  const user = await requireUser()
  const showDone = searchParams.status === 'done'
  const priority = TASK_PRIORITIES.find((x) => x === searchParams.priority)
  const mineOnly = searchParams.scope === 'mine'
  const [logs, me] = await Promise.all([
    prisma.activityLog.findMany({
      where: { entityType: 'LEAD', action: { in: ['task.created', 'task.completed'] } },
      orderBy: { createdAt: 'desc' },
      take: 3000,
    }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
  ])
  const open = foldTasks(logs)
    .filter((t) => t.done === showDone && (!mineOnly || t.assigneeId === user.id) && (!priority || t.priority === priority))
    .sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity))
  const leads = await prisma.lead.findMany({
    where: { id: { in: [...new Set(open.map((t) => t.leadId))] } },
    select: { id: true, email: true, firstName: true, lastName: true, assignedToId: true },
  })
  const byId = new Map(leads.map((l) => [l.id, l]))
  const now = Date.now()

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Tasks</h1>
      <form className="mb-4 flex flex-wrap gap-2">
        <Select name="status" defaultValue={showDone ? 'done' : 'open'} className="h-9 w-32">
          <option value="open">Open</option>
          <option value="done">Completed</option>
        </Select>
        <Select name="priority" defaultValue={priority ?? ''} className="h-9 w-36">
          <option value="">Any priority</option>
          {TASK_PRIORITIES.map((x) => (
            <option key={x} value={x}>
              {x.toLowerCase()}
            </option>
          ))}
        </Select>
        <Select name="scope" defaultValue={mineOnly ? 'mine' : ''} className="h-9 w-32">
          <option value="">Everyone</option>
          <option value="mine">Mine</option>
        </Select>
        <Button size="sm" type="submit" variant="outline">
          Filter
        </Button>
      </form>
      {open.length === 0 ? <p className="text-sm text-muted-foreground">Nothing to do. Add tasks from a lead page.</p> : null}
      <div className="divide-y rounded-lg border">
        {open.map((t) => {
          const lead = byId.get(t.leadId)
          const overdue = t.dueAt !== null && t.dueAt.getTime() < now
          return (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
              <div>
                <div className="font-medium">
                  {t.title} <Badge variant={t.priority === 'HIGH' ? 'destructive' : 'outline'}>{t.priority.toLowerCase()}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {lead ? <Link href={`/sales/leads/${lead.id}`} className="underline">{leadName(lead)}</Link> : 'lead removed'}
                  {t.dueAt ? ` · due ${formatDateTime(t.dueAt, me.timeZone)}` : ' · no due date'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {overdue ? <Badge variant="destructive">Overdue</Badge> : null}
                {lead && !t.done ? <CompleteTaskButton leadId={t.leadId} taskId={t.id} /> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
