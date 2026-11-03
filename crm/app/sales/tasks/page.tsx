import { ChevronRight, Search } from 'lucide-react'
import Link from 'next/link'
import { TASK_PRIORITIES, type CrmTask } from '@/components/crm/crm-utils'
import { TaskRow, type TaskView } from '@/components/crm/LeadNotesTasks'
import { MeetingTaskRow } from '@/components/crm/MeetingTaskRow'
import { NewTaskForm, TeamTaskRow } from '@/components/crm/TaskForms'
import { PageIntro } from '@/components/PageIntro'
import { buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input, Select } from '@/components/ui/input'
import { Popover } from '@/components/ui/popover'
import { requireUser } from '@/lib/auth'
import { formatDateTime, leadName } from '@/lib/format'
import { notArchivedBy } from '@/lib/lead-archive'
import { loadMeetingTasks } from '@/lib/meeting-tasks'
import { prisma } from '@/lib/prisma'
import { tasksForUser } from '@/lib/tasks'
import { loadTeamTasks, taskCreators, type TeamTask } from '@/lib/team-tasks'
import { localMidnight } from '@/lib/time'

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
  const byPerson = isAdmin && scope === 'all' && !person && searchParams.group === 'person'
  const q = (searchParams.q ?? '').trim().slice(0, 100)
  const needle = q.toLowerCase()

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
  const haystack = (i: Item): string =>
    i.kind === 'lead'
      ? [i.task.title, byId.get(i.task.leadId) ? leadName(byId.get(i.task.leadId)!) : '', byId.get(i.task.leadId)?.company, label(i.task.assigneeId)].join(' ')
      : [i.task.title, label(i.task.ownerId)].join(' ')
  const items = [...leadItems, ...teamItems].filter((i) => !needle || haystack(i).toLowerCase().includes(needle)).sort((a, b) =>
    showDone ? (b.task.completedAt?.getTime() ?? 0) - (a.task.completedAt?.getTime() ?? 0) : (a.task.dueAt?.getTime() ?? Infinity) - (b.task.dueAt?.getTime() ?? Infinity),
  )
  const meetingTasks =
    scope === 'assigned'
      ? []
      : (await loadMeetingTasks(scope === 'all' ? undefined : user.id)).filter((t) => t.done === showDone && (!priority || t.priority === priority) && (!person || t.leadId === person) && (!needle || `${t.title} ${t.meetingTitle ?? ''}`.toLowerCase().includes(needle)))

  const now = new Date()
  const tz = me.timeZone
  // Day boundaries are midnights in the user's own time zone
  const day0 = localMidnight(now, tz, 0)
  const day1 = localMidnight(now, tz, 1)
  const day2 = localMidnight(now, tz, 2)
  const day7 = localMidnight(now, tz, 7)
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions): string => new Intl.DateTimeFormat('en-US', { timeZone: tz, ...o }).format(d)
  const time = (d: Date): string => fmt(d, { hour: 'numeric', minute: '2-digit' })

  type Bucket = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none'
  const bucketOf = (d: Date | null): Bucket => (!d ? 'none' : d < now ? 'overdue' : d < day1 ? 'today' : d < day2 ? 'tomorrow' : d < day7 ? 'week' : 'later')
  const inBucket = (b: Bucket): Item[] => items.filter((i) => bucketOf(i.task.dueAt) === b)

  /** The left-hand "when" column: the part of the date that matters for that section, big; context, small. */
  const stamp = (i: Item, section: Bucket | 'done' | 'person'): { top: string; sub?: string; tone?: string } => {
    const d = i.task.dueAt
    if (section === 'done') return i.task.completedAt ? { top: fmt(i.task.completedAt, { month: 'short', day: 'numeric' }), sub: 'done' } : { top: '—' }
    if (!d) return { top: '—', sub: section === 'person' ? 'no date' : undefined }
    if (d < now) {
      const late = Math.floor((day0.getTime() - d.getTime()) / 86_400_000) + 1
      return d >= day0 ? { top: time(d), sub: 'today', tone: 'text-red-400' } : { top: late === 1 ? 'Yesterday' : `${late}d late`, sub: fmt(d, { month: 'short', day: 'numeric' }), tone: 'text-red-400' }
    }
    if (d < day1) return { top: time(d), sub: section === 'person' ? 'today' : undefined }
    if (d < day2) return { top: time(d), sub: section === 'person' ? 'tomorrow' : undefined }
    if (d < day7) return { top: fmt(d, { weekday: 'short' }), sub: time(d) }
    return { top: fmt(d, { month: 'short', day: 'numeric' }), sub: fmt(d, { weekday: 'short' }) }
  }

  const ownerOf = (i: Item): string | null => (i.kind === 'lead' ? i.task.assigneeId : i.task.ownerId)
  type Section = { id: string; title: string; hint?: string; tone: string; list: Item[]; mode: Bucket | 'done' | 'person'; open: boolean }
  let sections: Section[]
  if (showDone) sections = [{ id: 'done', title: 'Completed', hint: 'Most recent first', tone: 'bg-emerald-400', list: items, mode: 'done', open: true }]
  else if (byPerson) {
    const owners = [...new Set(items.map(ownerOf))].sort((a, b) => (a === user.id ? -1 : b === user.id ? 1 : label(a).localeCompare(label(b))))
    sections = owners.map((o) => {
      const list = items.filter((i) => ownerOf(i) === o)
      const late = list.filter((i) => i.task.dueAt && i.task.dueAt < now).length
      return { id: `p-${o ?? 'none'}`, title: o === user.id ? 'You' : label(o), hint: late ? `${late} overdue` : undefined, tone: late ? 'bg-red-400' : 'bg-primary', list, mode: 'person' as const, open: true }
    })
  } else {
    sections = [
      { id: 'overdue', title: 'Overdue', hint: 'Past their due time', tone: 'bg-red-400', list: inBucket('overdue'), mode: 'overdue', open: true },
      { id: 'today', title: 'Today', tone: 'bg-primary', list: inBucket('today'), mode: 'today', open: true },
      { id: 'tomorrow', title: 'Tomorrow', hint: fmt(day1, { weekday: 'long', month: 'short', day: 'numeric' }), tone: 'bg-sky-400', list: inBucket('tomorrow'), mode: 'tomorrow', open: true },
      { id: 'week', title: 'This week', hint: 'Next 7 days', tone: 'bg-violet-400', list: inBucket('week'), mode: 'week', open: true },
      { id: 'later', title: 'Later', tone: 'bg-slate-400', list: inBucket('later'), mode: 'later', open: false },
      { id: 'none', title: 'No due date', hint: 'Give these a date so they don’t slip', tone: 'bg-slate-500', list: inBucket('none'), mode: 'none', open: false },
    ]
    // If nothing urgent is showing, open the rest so the page is never a stack of closed boxes
    if (!sections.some((x) => x.open && x.list.length)) sections.forEach((x) => (x.open = true))
  }
  sections = sections.filter((x) => x.list.length)

  const view = (t: CrmTask): TaskView => ({
    id: t.id,
    leadId: t.leadId,
    title: t.title,
    dueAt: t.dueAt?.toISOString() ?? null,
    dueLabel: t.dueAt ? formatDateTime(t.dueAt, tz) : null,
    priority: t.priority,
    assigneeId: t.assigneeId,
    assigneeLabel: t.assigneeId ? label(t.assigneeId) : null,
    done: t.done,
    overdue: Boolean(t.dueAt && t.dueAt < now),
    auto: t.auto,
  })

  const href = (params: Record<string, string | undefined>): string => {
    const merged: Record<string, string | undefined> = { scope, status: showDone ? 'done' : undefined, priority, person, q: q || undefined, group: byPerson ? 'person' : undefined, ...params }
    if (merged.scope !== 'all') merged.person = merged.group = undefined
    const qs = new URLSearchParams(Object.entries(merged).filter(([, v]) => v) as [string, string][])
    return `/sales/tasks${qs.size ? `?${qs}` : ''}`
  }
  const seg = (items: [string, Record<string, string | undefined>, boolean][]): React.ReactElement => (
    <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
      {items.map(([text, params, active]) => (
        <Link key={text} href={href(params)} aria-current={active ? 'page' : undefined} className={`rounded-md px-3 py-1 text-sm transition-colors ${active ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          {text}
        </Link>
      ))}
    </div>
  )
  const assignees = isAdmin ? teammates : teammates.filter((p) => p.id === user.id || people.find((x) => x.id === p.id)?.role === 'ADMIN')
  const leadOptions = leadRows.map((l) => ({ id: l.id, label: [leadName(l), l.company].filter(Boolean).join(' · ') }))

  const count = (b: Bucket): number => inBucket(b).length
  const tiles: { id: string; label: string; n: number; tone: string; ring: string }[] = [
    { id: 'overdue', label: 'Overdue', n: count('overdue'), tone: 'text-red-400', ring: 'border-red-500/30 bg-red-500/[0.06]' },
    { id: 'today', label: 'Today', n: count('today'), tone: 'text-primary', ring: 'border-primary/30 bg-primary/[0.06]' },
    { id: 'tomorrow', label: 'Next 7 days', n: count('tomorrow') + count('week'), tone: 'text-foreground', ring: 'border-border' },
    { id: 'later', label: 'Later / no date', n: count('later') + count('none'), tone: 'text-muted-foreground', ring: 'border-border' },
  ]

  const row = (item: Item, mode: Section['mode']): React.ReactElement => {
    const st = stamp(item, mode)
    let body: React.ReactElement
    if (item.kind === 'team') {
      const t = item.task
      const meta = [byPerson ? null : t.ownerId !== user.id ? `For ${label(t.ownerId)}` : null, t.createdById && t.createdById !== t.ownerId ? `from ${label(t.createdById)}` : null].filter(Boolean).join(' · ')
      body = (
        <TeamTaskRow
          ownerId={t.ownerId}
          taskId={t.id}
          title={t.title}
          done={t.done}
          dueLabel={t.dueAt ? formatDateTime(t.dueAt, tz) : null}
          overdue={Boolean(t.dueAt && t.dueAt < now)}
          priority={t.priority}
          meta={meta || undefined}
          onCalendar={!!t.calendarEntryId}
          canDelete={isAdmin || t.ownerId === user.id || t.createdById === user.id}
          hideDue
        />
      )
    } else {
      const t = item.task
      const lead = byId.get(t.leadId)!
      body = (
        <TaskRow
          task={view(t)}
          teammates={teammates}
          timeZone={tz}
          hideDue
          contact={
            <Link href={`/sales/leads/${lead.id}`} className="font-medium text-foreground/80 underline-offset-4 hover:underline">
              {leadName(lead)}
              {lead.company ? ` · ${lead.company}` : ''}
            </Link>
          }
        />
      )
    }
    return (
      <li key={`${item.kind}-${item.task.id}`} className="grid grid-cols-[3.5rem_1fr] gap-2 px-3 hover:bg-muted/30 sm:grid-cols-[5.5rem_1fr] sm:gap-3 sm:px-4">
        <div className="py-2.5 text-end leading-tight">
          <div className={`text-xs font-medium tabular-nums sm:text-sm ${st.tone ?? ''}`}>{st.top}</div>
          {st.sub ? <div className="text-[11px] text-muted-foreground">{st.sub}</div> : null}
        </div>
        <div className="min-w-0 border-s border-border/60 ps-2 sm:ps-3">{body}</div>
      </li>
    )
  }

  const section = (id: string, title: string, hint: string | undefined, tone: string, n: number, open: boolean, children: React.ReactNode): React.ReactElement => (
    <details key={id} id={id} open={open} className="group/sec scroll-mt-6 overflow-hidden rounded-xl border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-muted/30 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open/sec:rotate-90" aria-hidden />
        <span className={`h-2 w-2 shrink-0 rounded-full ${tone}`} aria-hidden />
        <span className="font-semibold">{title}</span>
        <span className="rounded-full bg-muted px-2 py-px text-xs tabular-nums text-muted-foreground">{n}</span>
        {hint ? <span className="hidden truncate text-xs text-muted-foreground sm:inline">{hint}</span> : null}
      </summary>
      <ul className="divide-y divide-border/60 border-t border-border/60">{children}</ul>
    </details>
  )

  const nothing = items.length === 0 && meetingTasks.length === 0
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageIntro title="Tasks" hint={isAdmin ? 'Everything that needs doing, by when it’s due. Give anyone a task and block it on their calendar.' : 'Everything that needs doing, by when it’s due. Tick a box to complete it.'} />
        <Popover label="+ New task" panelClassName="sm:w-[min(92vw,30rem)]">
          <NewTaskForm me={user.id} assignees={assignees} leads={leadOptions} isAdmin={isAdmin} />
        </Popover>
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          {seg([
            ['Mine', { scope: 'mine' }, scope === 'mine'],
            ['Assigned by me', { scope: 'assigned' }, scope === 'assigned'],
            ...(isAdmin ? [['Everyone', { scope: 'all' }, scope === 'all'] as [string, Record<string, string | undefined>, boolean]] : []),
          ])}
          {seg([
            ['Open', { status: undefined }, !showDone],
            ['Completed', { status: 'done' }, showDone],
          ])}
          {isAdmin && scope === 'all' && !person && !showDone
            ? seg([
                ['By date', { group: undefined }, !byPerson],
                ['By person', { group: 'person' }, byPerson],
              ])
            : null}
        </div>
        <form className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="scope" value={scope} />
          {showDone ? <input type="hidden" name="status" value="done" /> : null}
          {byPerson ? <input type="hidden" name="group" value="person" /> : null}
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input name="q" defaultValue={q} placeholder="Search tasks, contacts, people…" aria-label="Search tasks" className="h-9 ps-8" />
          </div>
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
          {q || priority || person ? (
            <Link href={href({ q: undefined, priority: undefined, person: undefined })} className="text-sm text-muted-foreground hover:text-foreground">
              Clear
            </Link>
          ) : null}
        </form>
      </div>

      {!showDone && !nothing ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tiles.map((t) => (
            <a key={t.id} href={byPerson ? undefined : `#${t.id === 'later' && !count('later') ? 'none' : t.id}`} className={`rounded-xl border px-4 py-3 transition-colors hover:bg-muted/30 ${t.n ? t.ring : 'border-border opacity-60'}`}>
              <div className={`text-2xl font-semibold tabular-nums ${t.n ? t.tone : 'text-muted-foreground'}`}>{t.n}</div>
              <div className="text-xs text-muted-foreground">{t.label}</div>
            </a>
          ))}
        </div>
      ) : null}

      {nothing ? (
        <EmptyState
          title={q ? `Nothing matches “${q}”` : showDone ? 'No completed tasks yet' : scope === 'assigned' ? 'You have not given anyone a task' : 'You are all caught up 🎉'}
          description={q ? 'Try a different word, or clear the search.' : showDone ? 'Completed tasks show up here.' : 'Use “+ New task” to add one, for yourself or a teammate.'}
        />
      ) : null}

      <div className="space-y-3">
        {sections.map((s) => section(s.id, s.title, s.hint, s.tone, s.list.length, s.open, s.list.map((i) => row(i, s.mode))))}
        {meetingTasks.length
          ? section(
              'meetings',
              'From meetings',
              'Action items captured in team meetings',
              'bg-amber-400',
              meetingTasks.length,
              sections.length === 0,
              meetingTasks.map((t) => (
                <li key={t.id} className="px-4">
                  <MeetingTaskRow ownerId={t.leadId} taskId={t.id} title={t.title} meeting={t.meetingTitle} done={t.done} meta={scope === 'all' ? label(t.leadId) : undefined} />
                </li>
              )),
            )
          : null}
      </div>
    </div>
  )
}
