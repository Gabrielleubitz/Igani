import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { leadScore, scoreLabel, staleDays } from '@/components/crm/crm-utils'
import { EditContactForm } from '@/components/crm/EditContactForm'
import { EmailComposer } from '@/components/crm/EmailComposer'
import { LeadActions } from '@/components/crm/LeadActions'
import { AddNoteForm, AddTaskForm, LogTouchButtons, TaskRow, type TaskView } from '@/components/crm/LeadNotesTasks'
import { StagePill } from '@/components/crm/StagePill'
import { LeadControls } from '@/components/LeadControls'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { appUrl } from '@/lib/env'
import { formatDateTime, formatMoney, leadName, statusLabel, timeAgo } from '@/lib/format'
import { canSeeLead } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { foldTasksFromLogs } from '@/lib/task-view'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const lead = await prisma.lead.findUnique({ where: { id: params.id }, select: { firstName: true, lastName: true, email: true } })
  return { title: lead ? leadName(lead) : 'Contact' }
}

const ICON: Record<string, string> = {
  'note.added': '📝',
  'touch.logged': '📞',
  'email.sent': '✉️',
  'lead.status_changed': '🏷️',
  'lead.assigned': '👤',
  'lead.created': '✨',
  'lead.resubmitted': '🔁',
  'lead.edited': '✏️',
  'lead.archived': '🗄️',
  'lead.restored': '♻️',
  'meeting.cancelled': '🚫',
}
const TOUCH: Record<string, string> = { call: 'Call', email: 'Email', meeting: 'Meeting', whatsapp: 'WhatsApp' }
const HIDDEN = new Set(['task.reminded'])

export default async function LeadPage({ params }: { params: { id: string } }): Promise<React.ReactElement> {
  const user = await requireUser()
  const isAdmin = user.role === 'ADMIN'
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: { assignedTo: { select: { name: true, email: true } }, bookings: { orderBy: { startTime: 'desc' }, take: 20, include: { host: { select: { name: true } } } } },
  })
  if (!lead || !canSeeLead(user, lead)) notFound()

  const [logs, people, me, threshold, myPage] = await Promise.all([
    prisma.activityLog.findMany({
      where: { entityType: 'LEAD', entityId: lead.id },
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.user.findMany({ where: { role: { not: null } }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: 'asc' } }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true, name: true } }),
    getSetting('leads.staleDays'),
    prisma.bookingPage.findFirst({ where: { active: true, hostId: user.id }, select: { slug: true } }),
  ])
  const anyPage = myPage ?? (await prisma.bookingPage.findFirst({ where: { active: true }, select: { slug: true }, orderBy: { createdAt: 'asc' } }))
  const tz = me.timeZone
  const nameOf = new Map(people.map((p) => [p.id, p.name ?? p.email ?? 'Teammate']))
  const reps = people.filter((p) => p.role === 'SALES' || p.role === 'ADMIN').map((r) => ({ id: r.id, label: r.name ?? r.email ?? r.id }))
  const teammates = people.map((p) => ({ id: p.id, label: p.name ?? p.email ?? p.id }))

  const { tasks, titles } = foldTasksFromLogs(logs)
  const now = new Date()
  const taskViews: TaskView[] = tasks
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity))
    .map((t) => ({
      id: t.id,
      leadId: t.leadId,
      title: t.title,
      dueAt: t.dueAt?.toISOString() ?? null,
      dueLabel: t.dueAt ? formatDateTime(t.dueAt, tz) : null,
      priority: t.priority,
      assigneeId: t.assigneeId,
      assigneeLabel: t.assigneeId ? (t.assigneeId === user.id ? 'You' : (nameOf.get(t.assigneeId) ?? 'Former teammate')) : null,
      done: t.done,
      overdue: Boolean(t.dueAt && t.dueAt < now),
      auto: t.auto,
    }))
  const openTasks = taskViews.filter((t) => !t.done).length
  const score = leadScore(lead)
  const lastTouch = logs.find((l) => l.actor !== null)?.createdAt ?? lead.createdAt
  const stale = staleDays(lead.status, lastTouch, now, threshold)
  const canArchive = isAdmin || lead.assignedToId === user.id
  const upcoming = lead.bookings.filter((b) => b.status !== 'CANCELLED' && b.endTime >= now).reverse()
  const past = lead.bookings.filter((b) => !(b.status !== 'CANCELLED' && b.endTime >= now))

  const describe = (l: (typeof logs)[number]): { title: string; body?: string } => {
    const m = (l.metadata ?? {}) as Record<string, unknown>
    const s = (v: unknown): string => (v == null ? '' : String(v))
    switch (l.action) {
      case 'note.added':
        return { title: 'Note', body: s(m.body) }
      case 'touch.logged':
        return { title: `${TOUCH[s(m.kind)] ?? 'Touch'} logged`, body: s(m.summary) || undefined }
      case 'email.sent':
        return { title: `Email sent: ${s(m.subject)}`, body: s(m.body) || undefined }
      case 'lead.status_changed':
        return {
          title: `Stage: ${statusLabel(s(m.from))} → ${statusLabel(s(m.to))}`,
          body: [m.lostReason ? `Reason: ${s(m.lostReason)}` : '', m.dealValue != null ? `Deal value: ${formatMoney(Number(m.dealValue))}` : '', m.bookingId ? 'Meeting booked' : ''].filter(Boolean).join(' · ') || undefined,
        }
      case 'lead.assigned': {
        const to = m.to ?? m.assignedToId
        const who = (id: unknown): string => (id ? (nameOf.get(String(id)) ?? 'former teammate') : 'nobody')
        const how = m.strategy === 'round-robin' ? ' (auto, round-robin)' : m.strategy === 'reassign-on-deactivate' ? ' (owner left the team)' : ''
        return { title: 'from' in m ? `Owner: ${who(m.from)} → ${who(to)}${how}` : `Assigned to ${who(to)}${how}` }
      }
      case 'lead.created':
        return { title: `Contact created${m.source ? ` · source ${s(m.source)}` : ''}` }
      case 'lead.resubmitted':
        return { title: `Contacted us again${m.source ? ` via ${s(m.source)}` : ''}`, body: s(m.message) || undefined }
      case 'lead.edited':
        return { title: `Details edited${Array.isArray(m.fields) && m.fields.length ? `: ${(m.fields as string[]).join(', ')}` : ''}` }
      case 'lead.archived':
        return { title: 'Archived' }
      case 'lead.restored':
        return { title: 'Restored from archive' }
      case 'lead.assignment_skipped':
        return { title: 'Auto-assign skipped: no active sales reps' }
      case 'meeting.cancelled':
        return { title: `Meeting cancelled: ${s(m.title)}`, body: m.start ? formatDateTime(new Date(s(m.start)), tz) : undefined }
      case 'task.created':
        return { title: `Task added: ${s(m.title)}`, body: m.auto ? 'Created automatically around a meeting' : undefined }
      case 'task.completed':
        return { title: `Task done: ${titles.get(s(m.taskId)) ?? 'task'}` }
      case 'task.reopened':
        return { title: `Task reopened: ${titles.get(s(m.taskId)) ?? 'task'}` }
      case 'task.updated':
        return { title: `Task edited: ${titles.get(s(m.taskId)) ?? 'task'}` }
      case 'task.deleted':
        return { title: `Task deleted: ${titles.get(s(m.taskId)) ?? 'task'}` }
      default:
        return { title: l.action.replace(/[._]/g, ' ') }
    }
  }
  const timeline = logs.filter((l) => !HIDDEN.has(l.action))

  const facts: [string, React.ReactNode][] = (
    [
      ['Email', <a key="e" href={`mailto:${lead.email}`} className="break-all underline-offset-4 hover:underline">{lead.email}</a>],
      ['Phone', lead.phone ? <a key="p" href={`tel:${lead.phone}`} className="underline-offset-4 hover:underline">{lead.phone}</a> : null],
      ['Company', lead.company],
      ['Website', lead.website ? <a key="w" href={/^https?:\/\//.test(lead.website) ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="break-all underline-offset-4 hover:underline">{lead.website.replace(/^https?:\/\//, '')}</a> : null],
      ['Owner', lead.assignedTo ? (lead.assignedTo.name ?? lead.assignedTo.email) : 'Unassigned'],
      ['Budget', lead.budget],
      ['Deal value', lead.dealValue != null ? formatMoney(lead.dealValue) : null],
      ['Lost reason', lead.status === 'LOST' ? lead.lostReason : null],
      ['Source', lead.source],
      ['Campaign', [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(' / ') || null],
      ['Created', formatDateTime(lead.createdAt, tz)],
      ['Last touch', timeAgo(lastTouch, now)],
    ] as [string, React.ReactNode][]
  ).filter(([, v]) => v !== null && v !== '' && v !== undefined)

  return (
    <div className="space-y-6">
      <Link href="/sales/leads" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← All contacts
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20 text-lg font-semibold text-primary">
              {(lead.firstName?.[0] ?? lead.email[0] ?? '?').toUpperCase()}
              {lead.lastName?.[0]?.toUpperCase() ?? ''}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold">{leadName(lead)}</h1>
              <p className="truncate text-sm text-muted-foreground">{[lead.company, lead.email].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <StagePill status={lead.status} />
            {lead.status !== 'WON' && lead.status !== 'LOST' ? (
              <Badge variant={score >= 65 ? 'default' : 'secondary'} title="Heat score: how far along the deal is plus how complete the contact details are">
                {scoreLabel(score)} · {score}
              </Badge>
            ) : null}
            {stale !== null ? <Badge variant="warning">No contact for {stale} days</Badge> : null}
            {lead.archived ? <Badge variant="outline">Archived</Badge> : null}
            {openTasks ? <Badge variant="outline">{openTasks} open task{openTasks === 1 ? '' : 's'}</Badge> : null}
            {lead.tags.map((t) => (
              <Link key={t} href={`/sales/leads?tag=${encodeURIComponent(t)}`} className="rounded-full bg-secondary px-2 py-0.5 text-xs hover:bg-secondary/70">
                #{t}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <EmailComposer leadId={lead.id} email={lead.email} firstName={lead.firstName} company={lead.company} senderName={me.name ?? user.email} bookingUrl={anyPage ? appUrl(`/book/${anyPage.slug}`) : null} />
            {lead.phone ? (
              <a href={`tel:${lead.phone}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                📞 Call
              </a>
            ) : null}
            {user.role !== 'MARKETING' ? (
              <Link href={`/sales/invite?leadId=${lead.id}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                📅 Invite to meeting
              </Link>
            ) : null}
          </div>
          <LeadControls leadId={lead.id} status={lead.status} dealValue={lead.dealValue} assignedToId={lead.assignedToId} currentUserId={user.id} isAdmin={isAdmin} canClaim={user.role === 'SALES'} reps={reps} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 [&>*]:min-w-0">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {facts.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <span className="shrink-0 text-muted-foreground">{k}</span>
                  <span className="min-w-0 text-right">{v}</span>
                </div>
              ))}
              {lead.message ? (
                <div className="pt-2">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Their message</div>
                  <p className="max-h-60 overflow-auto whitespace-pre-wrap rounded-md border bg-background/40 p-3 text-muted-foreground">{lead.message}</p>
                </div>
              ) : null}
              <details className="group pt-2">
                <summary className="cursor-pointer select-none text-sm font-medium text-primary hover:underline">Edit details</summary>
                <div className="pt-3">
                  <EditContactForm
                    key={lead.updatedAt.toISOString()}
                    leadId={lead.id}
                    initial={{ firstName: lead.firstName, lastName: lead.lastName, phone: lead.phone, company: lead.company, website: lead.website, budget: lead.budget, dealValue: lead.dealValue, tags: lead.tags }}
                  />
                </div>
              </details>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tasks {openTasks ? <span className="text-sm font-normal text-muted-foreground">({openTasks} open)</span> : null}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {taskViews.length === 0 ? <p className="text-sm text-muted-foreground">No tasks yet. Add a follow-up so nothing slips.</p> : null}
              <div className="divide-y">
                {taskViews.map((t) => (
                  <TaskRow key={t.id} task={t} teammates={teammates} />
                ))}
              </div>
              <AddTaskForm leadId={lead.id} teammates={teammates} currentUserId={user.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Meetings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {lead.bookings.length === 0 ? <p className="text-muted-foreground">No meetings yet.</p> : null}
              {[...upcoming, ...past].map((b) => (
                <div key={b.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className={b.status === 'CANCELLED' ? 'text-muted-foreground line-through' : 'font-medium'}>{b.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(b.startTime, tz)} · {b.host.name ?? 'host'}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {b.meetUrl && b.status === 'CONFIRMED' && b.endTime >= now ? (
                      <a href={b.meetUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline-offset-4 hover:underline">
                        Join
                      </a>
                    ) : null}
                    <Badge variant={b.status === 'CONFIRMED' ? (b.endTime < now ? 'secondary' : 'success') : b.status === 'PENDING' ? 'warning' : 'outline'}>
                      {b.status === 'CONFIRMED' ? (b.endTime < now ? 'Held' : 'Confirmed') : b.status === 'PENDING' ? 'Awaiting guest' : 'Cancelled'}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <LeadActions leadId={lead.id} archived={lead.archived} canArchive={canArchive && user.role !== 'MARKETING'} isAdmin={isAdmin} name={leadName(lead)} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="space-y-4 pt-6">
              <LogTouchButtons leadId={lead.id} />
              <AddNoteForm leadId={lead.id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet. Notes, calls, emails and stage changes appear here.</p> : null}
              <ol className="relative space-y-5 border-l pl-6">
                {timeline.map((l) => {
                  const d = describe(l)
                  return (
                    <li key={l.id} className="relative text-sm">
                      <span aria-hidden className="absolute -left-[2.15rem] flex h-7 w-7 items-center justify-center rounded-full border bg-card text-xs">
                        {ICON[l.action] ?? (l.action.startsWith('task.') ? '☑️' : '•')}
                      </span>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span className={l.action === 'note.added' ? 'font-medium text-foreground' : 'font-medium'}>{d.title}</span>
                        <time dateTime={l.createdAt.toISOString()} title={formatDateTime(l.createdAt, tz)} className="text-xs text-muted-foreground">
                          {l.actor ? (l.actor.name ?? l.actor.email) : 'System'} · {timeAgo(l.createdAt, now)}
                        </time>
                      </div>
                      {d.body ? <p className={`mt-1 whitespace-pre-wrap ${l.action === 'note.added' ? 'rounded-md border bg-background/40 p-3' : 'text-muted-foreground'}`}>{d.body}</p> : null}
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
