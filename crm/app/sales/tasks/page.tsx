import Link from 'next/link'
import { TASK_PRIORITIES, type CrmTask } from '@/components/crm/crm-utils'
import { TaskRow, type TaskView } from '@/components/crm/LeadNotesTasks'
import { MeetingTaskRow } from '@/components/crm/MeetingTaskRow'
import { NewTaskForm, TeamTaskRow } from '@/components/crm/TaskForms'
import { PageIntro } from '@/components/PageIntro'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Select } from '@/components/ui/input'
import { Popover } from '@/components/ui/popover'
import { requireUser } from '@/lib/auth'
import { formatDateTime, leadName } from '@/lib/format'
import { notArchivedBy } from '@/lib/lead-archive'
import { loadMeetingTasks } from '@/lib/meeting-tasks'
import { prisma } from '@/lib/prisma'
import { tasksForUser } from '@/lib/tasks'
import { loadTeamTasks, taskCreators, type TeamTask } from '@/lib/team-tasks'
import { endOfLocalDay } from '@/lib/time'

export const metadata = { title: 'Tasks' }
export const dynamic = 'force-dynamic'

type Scope = 'mine' | 'assigned' | 'all'
/** One list for contact tasks and team tasks, so they sort and group together. */
type Item = { kind: 'lead'; task: CrmTask } | { kind: 'team'; task: TeamTask }

export default async function TasksPage({ searchParams }: { searchParams: Record<string, string | undefined> }): Promise<React.ReactElement> {
  const user = await requireUser()
  const isAdmin = user.role === 'ADMIN'
  const showDone = searchParams.status === 'done'
  const priority = TASK_PRIORITIES.find((x) => x === searchParams.priority)
  const scope: Scope = searchParams.scope === 'all' && isAdmin ? 'all' : searchParams.scope === 'assigned' ? 'assigned' : 'mine'
  const person = isAdmin && scope === 'all' ? searchParams.person : undefined

  const [{ all, mine, leads: byId }, me, people, teamTasks, leadRows] = await Promise.all([
    tasksForUser(user),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
    prisma.user.findMany({ where: { role: { not: null }, ...(isAdmin ? {} : { OR: [{ id: user.id }, { role: 'ADMIN' }] }) }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: 'asc' } }),
    loadTeamTasks(scope === 'mine' ? user.id : undefined),
    prisma.lead.findMany({
      where: { ...notArchivedBy(user.id), status: { not: 'LOST' }, ...(isAdmin ? {} : { assignedToId: user.id }) },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true },
    }),
  ])
  const nameOf = new Map(people.map((p) => [p.id, p.name ?? p.email ?? 'Teammate']))
  const label = (id: string | null): string => (id ? (id === user.id ? 'You' : (nameOf.get(id) ?? 'Former teammate')) : 'Unassigned')
  const teammates = people.map((p) => ({ id: p.id, label: p.name ?? p.email ?? p.id }))

  // Which tasks are in view
  const leadPool = scope === 'mine' ? mine : all
  const creators = scope === 'assigned' ? await taskCreators(all.map((t) => t.id)) : new Map<string, string | null>()
  const keep = (t: CrmTask): boolean => t.done === showDone && (!priority || t.priority === priority)
  const leadItems: Item[] = leadPool
    .filter(keep)
    .filter((t) => (scope === 'assigned' ? creators.get(t.id) === user.id && t.assigneeId !== user.id : true))
    .filter((t) => (person ? t.assigneeId === person : true))
    .map((task) => ({ kind: 'lead', task }))
  const teamItems: Item[] = teamTasks
    .filter(keep)
    .filter((t) => (scope === 'mine' ? t.ownerId === user.id : scope === 'assigned' ? t.createdById === user.id && t.ownerId !== user.id : isAdmin))
    .filter((t) => (person ? t.ownerId === person : true))
    .map((task) => ({ kind: 'team', task }))
  const items = [...leadItems, ...teamItems].sort((a, b) =>
    showDone ? (b.task.completedAt?.getTime() ?? 0) - (a.task.completedAt?.getTime() ?? 0) : (a.task.dueAt?.getTime() ?? Infinity) - (b.task.dueAt?.getTime() ?? Infinity),
  )
  const meetingTasks =
    scope === 'assigned'
      ? []
      : (await loadMeetingTasks(scope === 'all' ? undefined : user.id)).filter((t) => t.done === showDone && (!priority || t.priority === priority) && (!person || t.leadId === person))

  const now = new Date()
  const endOfToday = endOfLocalDay(now, me.timeZone) // "today" ends at midnight in the user's own time zone
  const groups: [string, Item[]][] = showDone
    ? [['Completed', items]]
    : [
        ['Overdue', items.filter((i) => i.task.dueAt && i.task.dueAt < now)],
        ['Today', items.filter((i) => i.task.dueAt && i.task.dueAt >= now && i.task.dueAt < endOfToday)],
        ['Upcoming', items.filter((i) => i.task.dueAt && i.task.dueAt >= endOfToday)],
        ['No due date', items.filter((i) => !i.task.dueAt)],
      ]

  const view = (t: CrmTask): TaskView => ({
    id: t.id,
    leadId: t.leadId,
    title: t.title,
    dueAt: t.dueAt?.toISOString() ?? null,
    dueLabel: t.dueAt ? formatDateTime(t.dueAt, me.timeZone) : null,
    priority: t.priority,
    assigneeId: t.assigneeId,
    assigneeLabel: t.assigneeId ? label(t.assigneeId) : null,
    done: t.done,
    overdue: Boolean(t.dueAt && t.dueAt < now),
    auto: t.auto,
  })

  const tab = (text: string, params: Record<string, string | undefined>, active: boolean): React.ReactElement => {
    const merged = { scope, status: showDone ? 'done' : undefined, priority, person, ...params }
    if (merged.scope !== 'all') merged.person = undefined
    const q = new URLSearchParams(Object.entries(merged).filter(([, v]) => v) as [string, string][])
    return (
      <Link href={`/sales/tasks${q.size ? `?${q}` : ''}`} className={`rounded-full border px-3 py-1 text-sm ${active ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
        {text}
      </Link>
    )
  }
  const assignees = isAdmin ? teammates : teammates.filter((p) => p.id === user.id || people.find((x) => x.id === p.id)?.role === 'ADMIN')
  const leadOptions = leadRows.map((l) => ({ id: l.id, label: [leadName(l), l.company].filter(Boolean).join(' · ') }))

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageIntro
          title="Tasks"
          hint={isAdmin ? 'Your follow-ups and team tasks. Give anyone a task, about a contact or not, and block it on their calendar.' : 'Your follow-ups and team tasks. Tick a box to complete it; hover a task to edit or delete it.'}
        />
        <Popover label="+ New task" panelClassName="sm:w-[min(92vw,30rem)]">
          <NewTaskForm me={user.id} assignees={assignees} leads={leadOptions} isAdmin={isAdmin} />
        </Popover>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {tab('My tasks', { scope: 'mine' }, scope === 'mine')}
        {tab('Assigned by me', { scope: 'assigned' }, scope === 'assigned')}
        {isAdmin ? tab('Everyone', { scope: 'all' }, scope === 'all') : null}
        <span className="mx-1 h-5 w-px bg-border" />
        {tab('Open', { status: undefined }, !showDone)}
        {tab('Completed', { status: 'done' }, showDone)}
        <form className="ml-auto flex flex-wrap items-center gap-2">
          <input type="hidden" name="scope" value={scope} />
          {showDone ? <input type="hidden" name="status" value="done" /> : null}
          {isAdmin && scope === 'all' ? (
            <Select name="person" aria-label="Teammate" defaultValue={person ?? ''} className="h-9 w-40">
              <option value="">Whole team</option>
              {teammates.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === user.id ? `${p.label} (me)` : p.label}
                </option>
              ))}
            </Select>
          ) : null}
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

      {items.length === 0 && meetingTasks.length === 0 ? (
        <EmptyState
          title={showDone ? 'No completed tasks yet' : scope === 'assigned' ? 'You have not given anyone a task' : 'You are all caught up 🎉'}
          description={showDone ? 'Completed tasks show up here.' : 'Use “+ New task” to add one, for yourself or a teammate.'}
        />
      ) : null}
      {meetingTasks.length ? (
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              From meetings <span className="tabular-nums">({meetingTasks.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {meetingTasks.map((t) => (
              <MeetingTaskRow key={t.id} ownerId={t.leadId} taskId={t.id} title={t.title} meeting={t.meetingTitle} done={t.done} meta={scope === 'all' ? label(t.leadId) : undefined} />
            ))}
          </CardContent>
        </Card>
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
              {list.map((item) => {
                if (item.kind === 'team') {
                  const t = item.task
                  const meta = [t.ownerId !== user.id ? `For ${label(t.ownerId)}` : null, t.createdById && t.createdById !== t.ownerId ? `from ${label(t.createdById)}` : null].filter(Boolean).join(' · ')
                  return (
                    <TeamTaskRow
                      key={t.id}
                      ownerId={t.ownerId}
                      taskId={t.id}
                      title={t.title}
                      done={t.done}
                      dueLabel={t.dueAt ? formatDateTime(t.dueAt, me.timeZone) : null}
                      overdue={Boolean(t.dueAt && t.dueAt < now)}
                      priority={t.priority}
                      meta={meta || undefined}
                      onCalendar={!!t.calendarEntryId}
                      canDelete={isAdmin || t.ownerId === user.id || t.createdById === user.id}
                    />
                  )
                }
                const t = item.task
                const lead = byId.get(t.leadId)!
                return (
                  <TaskRow
                    key={t.id}
                    task={view(t)}
                    teammates={teammates}
                    timeZone={me.timeZone}
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
