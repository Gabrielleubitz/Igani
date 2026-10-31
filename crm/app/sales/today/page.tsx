import Link from 'next/link'
import { leadScore, scoreLabel, staleDays } from '@/components/crm/crm-utils'
import { CompleteTaskButton } from '@/components/crm/LeadNotesTasks'
import { StagePill } from '@/components/crm/StagePill'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { formatDateTime, formatMoney, leadName, timeAgo } from '@/lib/format'
import { leadScope } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { isMyTask, loadTasks } from '@/lib/tasks'

export const metadata = { title: 'Today' }
export const dynamic = 'force-dynamic'

const OPEN = ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT'] as const

function greeting(tz: string): string {
  const h = Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', hourCycle: 'h23' }).format(new Date()))
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default async function TodayPage(): Promise<React.ReactElement> {
  const user = await requireUser()
  const isAdmin = user.role === 'ADMIN'
  const now = new Date()
  const endOfDay = new Date(now.getTime() + 864e5)
  const mineWhere = isAdmin ? {} : { assignedToId: user.id }
  const [me, threshold, meetings, openLeads, unclaimed, newThisWeek] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true, name: true } }),
    getSetting('leads.staleDays'),
    user.role === 'MARKETING'
      ? Promise.resolve([])
      : prisma.booking.findMany({
          where: { status: 'CONFIRMED', endTime: { gte: now }, startTime: { lt: endOfDay }, ...(isAdmin ? {} : { hostId: user.id }) },
          orderBy: { startTime: 'asc' },
          take: 20,
          include: { host: { select: { name: true } } },
        }),
    prisma.lead.findMany({ where: { archived: false, status: { in: [...OPEN] }, ...mineWhere }, take: 1000 }),
    user.role === 'MARKETING' ? Promise.resolve([]) : prisma.lead.findMany({ where: { archived: false, assignedToId: null, status: { in: [...OPEN] } }, orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.lead.count({ where: { AND: [leadScope(user), { archived: false, createdAt: { gte: new Date(now.getTime() - 7 * 864e5) } }] } }),
  ])
  const tz = me.timeZone

  const ownedIds = new Set(openLeads.map((l) => l.id))
  const allTasks = await loadTasks()
  const due = allTasks
    .filter((t) => !t.done && t.dueAt && t.dueAt < endOfDay && isMyTask(t, user.id, ownedIds.has(t.leadId) ? user.id : null))
    .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())
  const taskLeads = await prisma.lead.findMany({ where: { id: { in: [...new Set(due.map((t) => t.leadId))] } }, select: { id: true, email: true, firstName: true, lastName: true } })
  const byId = new Map(taskLeads.map((l) => [l.id, l]))

  const touches = await prisma.activityLog.groupBy({
    by: ['entityId'],
    where: { entityType: 'LEAD', entityId: { in: openLeads.map((l) => l.id) }, actorId: { not: null } },
    _max: { createdAt: true },
  })
  const lastTouch = new Map(touches.map((t) => [t.entityId, t._max.createdAt]))
  const stale = openLeads
    .map((l) => ({ lead: l, days: staleDays(l.status, lastTouch.get(l.id) ?? l.createdAt, now, threshold), score: leadScore(l) }))
    .filter((x): x is { lead: (typeof openLeads)[number]; days: number; score: number } => x.days !== null)
    .sort((a, b) => b.score - a.score || b.days - a.days)
  const hot = openLeads
    .map((l) => ({ lead: l, score: leadScore(l) }))
    .filter((x) => x.score >= 65)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
  const pipelineValue = openLeads.reduce((n, l) => n + (l.dealValue ?? 0), 0)
  const overdueCount = due.filter((t) => t.dueAt! < now).length

  const stats: { label: string; value: string | number; href: string; tone?: string }[] = [
    { label: isAdmin ? 'Open deals' : 'My open deals', value: openLeads.length, href: '/sales/board' },
    { label: 'Pipeline value', value: formatMoney(pipelineValue), href: '/sales/reports' },
    { label: 'Tasks due (next 24h)', value: due.length, href: '/sales/tasks', tone: overdueCount ? 'text-red-400' : undefined },
    { label: 'New leads (7 days)', value: newThisWeek, href: '/sales/leads' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'long', month: 'long', day: 'numeric' }).format(now)}</p>
          <h1 className="text-2xl font-semibold">
            {greeting(tz)}
            {me.name ? `, ${me.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Your daily starting point: what is due, who to call next, and which deals are hottest.</p>
        </div>
        {user.role !== 'MARKETING' ? (
          <div className="flex gap-2">
            <Link href="/sales/invite" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              📅 Send invite
            </Link>
            <Link href="/sales/leads" className={buttonVariants({ size: 'sm' })}>
              + Add contact
            </Link>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40">
            <div className={`text-2xl font-semibold tabular-nums ${s.tone ?? ''}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Tasks due &amp; overdue (next 24h)</span>
              <span className="text-sm font-normal text-muted-foreground">{due.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {due.length === 0 ? <p className="text-sm text-muted-foreground">Nothing due. Nice work! ✨</p> : null}
            {due.slice(0, 10).map((t) => {
              const l = byId.get(t.leadId)
              return (
                <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {t.title} {t.dueAt! < now ? <Badge variant="destructive" className="ml-1 align-middle">overdue</Badge> : null}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {l ? (
                        <Link href={`/sales/leads/${l.id}`} className="underline-offset-4 hover:underline">
                          {leadName(l)}
                        </Link>
                      ) : null}{' '}
                      · {formatDateTime(t.dueAt!, tz)}
                    </div>
                  </div>
                  <CompleteTaskButton leadId={t.leadId} taskId={t.id} />
                </div>
              )
            })}
            {due.length > 10 ? (
              <Link href="/sales/tasks" className="text-sm text-primary underline-offset-4 hover:underline">
                See all {due.length} →
              </Link>
            ) : null}
          </CardContent>
        </Card>

        {user.role !== 'MARKETING' ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Meetings in the next 24h</span>
                <span className="text-sm font-normal text-muted-foreground">{meetings.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {meetings.length === 0 ? <p className="text-sm text-muted-foreground">No meetings coming up.</p> : null}
              {meetings.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {b.title} · {b.guestName}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {formatDateTime(b.startTime, tz)}
                      {isAdmin ? ` · ${b.host.name ?? 'host'}` : ''}
                      {b.leadId ? (
                        <>
                          {' · '}
                          <Link href={`/sales/leads/${b.leadId}`} className="underline-offset-4 hover:underline">
                            contact
                          </Link>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {b.meetUrl ? (
                    <a href={b.meetUrl} target="_blank" rel="noreferrer" className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                      Join
                    </a>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Needs follow-up</span>
              <span className="text-sm font-normal text-muted-foreground">{stale.length}</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground">Open deals nobody has touched for {threshold}+ days, hottest first.</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {stale.length === 0 ? <p className="text-sm text-muted-foreground">Every open deal was touched recently. 👏</p> : null}
            {stale.slice(0, 10).map(({ lead, days, score }) => (
              <div key={lead.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/sales/leads/${lead.id}`} className="min-w-0 truncate font-medium underline-offset-4 hover:underline">
                  {leadName(lead)}
                </Link>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <StagePill status={lead.status} />
                  {days}d quiet · {scoreLabel(score)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Hottest deals</CardTitle>
            <p className="text-xs text-muted-foreground">Score out of 100: how far along the deal is plus how complete the contact details are.</p>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {hot.length === 0 ? <p className="text-sm text-muted-foreground">No hot deals right now. Move a few forward!</p> : null}
            {hot.map(({ lead, score }) => (
              <div key={lead.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/sales/leads/${lead.id}`} className="min-w-0 truncate font-medium underline-offset-4 hover:underline">
                  {leadName(lead)}
                  {lead.company ? <span className="font-normal text-muted-foreground"> · {lead.company}</span> : null}
                </Link>
                <Badge>{score}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {unclaimed.length ? (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>New leads waiting for an owner</span>
                <Link href="/sales/leads?assignee=none" className="text-sm font-normal text-primary underline-offset-4 hover:underline">
                  See all →
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {unclaimed.map((l) => (
                <Link key={l.id} href={`/sales/leads/${l.id}`} className="rounded-md border p-3 text-sm transition-colors hover:bg-muted/40">
                  <div className="truncate font-medium">{leadName(l)}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {l.company ?? l.email} · {timeAgo(l.createdAt, now)}
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
