import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CommissionTermsForm } from '@/components/admin/CommissionTermsForm'
import { TeamMemberForm } from '@/components/admin/TeamMemberForm'
import { PageIntro } from '@/components/PageIntro'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { formatDateTime, formatMoney, leadName, timeAgo } from '@/lib/format'
import { termsForAssignee } from '@/lib/deals'
import { prisma } from '@/lib/prisma'
import { isOpenTask } from '@/lib/team-metrics'
import { loadRepStats } from '@/lib/team-stats'
import { tasksForUser } from '@/lib/tasks'
import { STATUS_LABEL } from '@/lib/format'

export const metadata = { title: 'Salesperson' }
export const dynamic = 'force-dynamic'

export default async function TeamMemberPage({ params }: { params: { id: string } }): Promise<React.ReactElement> {
  const me = await requireUser(['ADMIN'])
  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, name: true, email: true, role: true, timeZone: true, createdAt: true } })
  if (!user || (user.role !== 'SALES' && user.role !== 'ADMIN')) notFound()
  const now = new Date()
  const [stats, tasks, leads, meetings] = await Promise.all([
    loadRepStats(me).then((all) => all.find((r) => r.id === user.id) ?? null),
    tasksForUser(me),
    prisma.lead.findMany({
      where: { archived: false, assignedToId: user.id, status: { notIn: ['WON', 'LOST'] } },
      orderBy: { updatedAt: 'desc' },
      take: 12,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true, status: true, quotedPrice: true, updatedAt: true },
    }),
    prisma.booking.findMany({ where: { hostId: user.id, status: 'CONFIRMED', startTime: { gt: now } }, orderBy: { startTime: 'asc' }, take: 8, select: { id: true, title: true, guestName: true, startTime: true } }),
  ])
  const open = tasks.all
    .filter((t) => isOpenTask(t, user.id, tasks.leads.get(t.leadId)?.assignedToId))
    .sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity))
  const display = user.name ?? user.email ?? 'Unnamed'
  const cards = stats
    ? [
        { label: 'Won', value: `₪${formatMoney(stats.wonValue)}`, sub: `${stats.won} deal${stats.won === 1 ? '' : 's'}` },
        { label: 'Last 30 days', value: `₪${formatMoney(stats.wonValue30)}`, sub: `${stats.won30} won` },
        { label: 'Win rate', value: stats.conversion == null ? '—' : `${stats.conversion}%`, sub: `${stats.won} won · ${stats.lost} lost` },
        { label: 'Open leads', value: String(stats.openLeads), sub: `${stats.upcomingMeetings} upcoming meetings` },
        { label: 'Open tasks', value: String(stats.openTasks), sub: stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : 'None overdue' },
        { label: 'Last active', value: stats.lastActive ? timeAgo(stats.lastActive, now) : 'Never', sub: `Joined ${user.createdAt.toLocaleDateString('en-GB')}` },
      ]
    : []
  return (
    <div className="space-y-6">
      <Link href="/admin/team" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← Sales team
      </Link>
      <PageIntro title={display} hint={`${user.email ?? ''} · ${user.role === 'ADMIN' ? 'Admin' : 'Sales'} · ${user.timeZone.replaceAll('_', ' ')}`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <div className="mt-1 text-2xl font-semibold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open tasks ({open.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {open.length === 0 ? <p className="text-sm text-muted-foreground">Nothing open. All caught up.</p> : null}
            {open.slice(0, 15).map((t) => {
              const lead = tasks.leads.get(t.leadId)
              const overdue = t.dueAt && t.dueAt < now
              return (
                <div key={t.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{t.title}</div>
                    {lead ? (
                      <Link href={`/sales/leads/${lead.id}`} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                        {leadName(lead)}
                      </Link>
                    ) : null}
                  </div>
                  <span className={`shrink-0 text-xs ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}>{t.dueAt ? `${overdue ? 'Overdue · ' : ''}${formatDateTime(t.dueAt, user.timeZone)}` : 'No due date'}</span>
                </div>
              )
            })}
            {open.length > 15 ? <p className="text-xs text-muted-foreground">+ {open.length - 15} more</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming meetings ({meetings.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {meetings.length === 0 ? <p className="text-sm text-muted-foreground">No meetings booked.</p> : null}
            {meetings.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0 truncate">
                  <span className="font-medium">{m.title}</span> <span className="text-muted-foreground">with {m.guestName}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(m.startTime, user.timeZone)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Open leads ({stats?.openLeads ?? leads.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {leads.length === 0 ? <p className="text-sm text-muted-foreground">No open leads assigned.</p> : null}
          {leads.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <Link href={`/sales/leads/${l.id}`} className="font-medium underline-offset-4 hover:underline">
                {leadName(l)}
                {l.company ? <span className="font-normal text-muted-foreground"> · {l.company}</span> : null}
              </Link>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{STATUS_LABEL[l.status]}</Badge>
                <span className="text-xs text-muted-foreground">{timeAgo(l.updatedAt, now)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      {user.role === 'SALES' ? (
        <Card>
          <CardHeader>
            <CardTitle>Commission terms</CardTitle>
          </CardHeader>
          <CardContent>
            <CommissionTermsForm userId={user.id} terms={await termsForAssignee(user.id)} usingDefaults={!(await prisma.allowedUser.findUnique({ where: { email: user.email ?? '' }, select: { commissionTerms: true } }))?.commissionTerms} />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamMemberForm userId={user.id} name={user.name ?? ''} email={user.email ?? ''} timeZone={user.timeZone} />
          <p className="mt-4 text-xs text-muted-foreground">
            Role and access are managed under{' '}
            <Link href="/admin/users" className="underline underline-offset-4">
              Team
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
