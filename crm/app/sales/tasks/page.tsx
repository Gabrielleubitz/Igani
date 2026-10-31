import Link from 'next/link'
import { TASK_PRIORITIES } from '@/components/crm/crm-utils'
import { TaskRow, type TaskView } from '@/components/crm/LeadNotesTasks'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/input'
import { buttonVariants } from '@/components/ui/button'
import { requireUser } from '@/lib/auth'
import { formatDateTime, leadName } from '@/lib/format'
import { leadScope } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'
import { isMyTask, loadTasks } from '@/lib/tasks'

export const metadata = { title: 'Tasks' }
export const dynamic = 'force-dynamic'

export default async function TasksPage({ searchParams }: { searchParams: Record<string, string | undefined> }): Promise<React.ReactElement> {
  const user = await requireUser()
  const showDone = searchParams.status === 'done'
  const priority = TASK_PRIORITIES.find((x) => x === searchParams.priority)
  const scope = searchParams.scope === 'all' ? 'all' : 'mine'
  const [visible, me, people] = await Promise.all([
    prisma.lead.findMany({ where: leadScope(user), select: { id: true, email: true, firstName: true, lastName: true, assignedToId: true, company: true } }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
    prisma.user.findMany({ where: { role: { not: null } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
  ])
  const byId = new Map(visible.map((l) => [l.id, l]))
  const nameOf = new Map(people.map((p) => [p.id, p.name ?? p.email ?? 'Teammate']))
  const teammates = people.map((p) => ({ id: p.id, label: p.name ?? p.email ?? p.id }))
  const all = (await loadTasks(user.role === 'ADMIN' ? undefined : visible.map((l) => l.id))).filter((t) => byId.has(t.leadId))
  const filtered = all
    .filter((t) => t.done === showDone && (scope === 'all' || isMyTask(t, user.id, byId.get(t.leadId)?.assignedToId)) && (!priority || t.priority === priority))
    .sort((a, b) => (showDone ? (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0) : (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity)))
  const now = new Date()
  const endOfToday = new Date(now)
  endOfToday.setHours(23, 59, 59, 999)

  const view = (t: (typeof filtered)[number]): TaskView => ({
    id: t.id,
    leadId: t.leadId,
    title: t.title,
    dueAt: t.dueAt?.toISOString() ?? null,
    dueLabel: t.dueAt ? formatDateTime(t.dueAt, me.timeZone) : null,
    priority: t.priority,
    assigneeId: t.assigneeId,
    assigneeLabel: t.assigneeId ? (t.assigneeId === user.id ? 'You' : (nameOf.get(t.assigneeId) ?? 'Former teammate')) : null,
    done: t.done,
    overdue: Boolean(t.dueAt && t.dueAt < now),
    auto: t.auto,
  })
  const groups: [string, typeof filtered][] = showDone
    ? [['Completed', filtered]]
    : [
        ['Overdue', filtered.filter((t) => t.dueAt && t.dueAt < now)],
        ['Today', filtered.filter((t) => t.dueAt && t.dueAt >= now && t.dueAt <= endOfToday)],
        ['Upcoming', filtered.filter((t) => t.dueAt && t.dueAt > endOfToday)],
        ['No due date', filtered.filter((t) => !t.dueAt)],
      ]
  const tab = (label: string, params: Record<string, string | undefined>, active: boolean): React.ReactElement => {
    const q = new URLSearchParams(Object.entries({ scope, status: showDone ? 'done' : undefined, priority, ...params }).filter(([, v]) => v) as [string, string][])
    return (
      <Link href={`/sales/tasks${q.size ? `?${q}` : ''}`} className={`rounded-full border px-3 py-1 text-sm ${active ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
        {label}
      </Link>
    )
  }

  return (
    <div className="space-y-5">
      <PageIntro title="Tasks" hint="Follow-ups across your contacts. Tick a box to complete it; hover a task to edit or delete it. Add new tasks from a contact page." />
      <div className="flex flex-wrap items-center gap-2">
        {tab('My tasks', { scope: 'mine' }, scope === 'mine')}
        {tab(user.role === 'ADMIN' ? 'Everyone' : 'All I can see', { scope: 'all' }, scope === 'all')}
        <span className="mx-1 h-5 w-px bg-border" />
        {tab('Open', { status: undefined }, !showDone)}
        {tab('Completed', { status: 'done' }, showDone)}
        <form className="ml-auto flex items-center gap-2">
          <input type="hidden" name="scope" value={scope} />
          {showDone ? <input type="hidden" name="status" value="done" /> : null}
          <Select name="priority" aria-label="Priority" defaultValue={priority ?? ''} className="h-9 w-36">
            <option value="">Any priority</option>
            {TASK_PRIORITIES.map((x) => (
              <option key={x} value={x}>
                {x.charAt(0) + x.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
          <button className={buttonVariants({ size: 'sm', variant: 'outline' })}>Apply</button>
        </form>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={showDone ? 'No completed tasks yet' : 'You are all caught up 🎉'}
          description={showDone ? 'Completed tasks show up here.' : 'No open tasks match. Open a contact to add a follow-up.'}
          action={
            <Link href="/sales/leads" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Go to contacts
            </Link>
          }
        />
      ) : null}
      {groups
        .filter(([, list]) => list.length)
        .map(([title, list]) => (
          <Card key={title}>
            <CardHeader className="pb-1">
              <CardTitle className={`text-sm font-semibold uppercase tracking-wide ${title === 'Overdue' ? 'text-red-400' : 'text-muted-foreground'}`}>
                {title} <span className="tabular-nums">({list.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {list.map((t) => {
                const lead = byId.get(t.leadId)!
                return (
                  <TaskRow
                    key={t.id}
                    task={view(t)}
                    teammates={teammates}
                    contact={
                      <Link href={`/sales/leads/${lead.id}`} className="font-medium text-foreground/80 underline-offset-4 hover:underline">
                        {leadName(lead)}
                        {lead.company ? ` · ${lead.company}` : ''}
                      </Link>
                    }
                  />
                )
              })}
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
