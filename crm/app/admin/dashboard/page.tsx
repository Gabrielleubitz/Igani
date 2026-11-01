import Link from 'next/link'
import { commissionStatus } from '@/lib/commission'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { formatMoney, leadName, timeAgo } from '@/lib/format'
import { MeetingTaskRow } from '@/components/crm/MeetingTaskRow'
import { loadMeetingTasks } from '@/lib/meeting-tasks'
import { prisma } from '@/lib/prisma'
import { taskOwner, tasksForUser } from '@/lib/tasks'
import { getSetting } from '@/lib/settings'

export const metadata = { title: 'Overview' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage(): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const staleDays = await getSetting('leads.staleDays')
  const now = new Date()
  const stale = new Date(now.getTime() - staleDays * 86_400_000)
  const dayEnd = new Date(now.getTime() + 86_400_000)
  const open = { archived: false, status: { notIn: ['WON', 'LOST'] as ('WON' | 'LOST')[] } }
  const [total, won, lost, unassigned, staleCount, newWeek, today, pendingApprovals, wonValue, openValue, commissionRows, recentLeads, reps] = await Promise.all([
    prisma.lead.count({ where: { archived: false } }),
    prisma.lead.count({ where: { archived: false, status: 'WON' } }),
    prisma.lead.count({ where: { archived: false, status: 'LOST' } }),
    prisma.lead.count({ where: { ...open, assignedToId: null } }),
    // "Quiet" = no note/call/email/stage change by a teammate for N days: the same rule as Today's "Needs follow-up".
    prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n FROM "Lead" l
      WHERE l.archived = false AND l.status NOT IN ('WON', 'LOST')
        AND COALESCE((SELECT max(a."createdAt") FROM "ActivityLog" a WHERE a."entityType" = 'LEAD' AND a."entityId" = l.id AND a."actorId" IS NOT NULL), l."createdAt") < ${stale}`.then((r) => Number(r[0]?.n ?? 0)),
    prisma.lead.count({ where: { archived: false, createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } }),
    prisma.booking.count({ where: { status: 'CONFIRMED', source: { not: 'TEAM_MEETING' }, endTime: { gte: now }, startTime: { lt: dayEnd } } }),
    prisma.booking.count({ where: { status: 'PENDING', source: 'PUBLIC_PAGE', startTime: { gt: now } } }),
    // Company revenue = the quoted price of won deals. Pipeline = the quoted price of open deals that have one.
    prisma.lead.aggregate({ where: { archived: false, status: 'WON' }, _sum: { quotedPrice: true } }),
    prisma.lead.aggregate({ where: open, _sum: { quotedPrice: true } }),
    prisma.lead.findMany({
      where: { archived: false, status: 'WON', commissionTotal: { not: null } },
      select: { commissionTotal: true, commissionDownpayment: true, commissionFinal: true, downpaymentReceivedAt: true, finalPaymentReceivedAt: true, downpaymentPaidAt: true, finalPaidAt: true },
    }),
    prisma.lead.findMany({ where: { archived: false }, orderBy: { createdAt: 'desc' }, take: 6, include: { assignedTo: { select: { name: true, email: true } } } }),
    prisma.user.findMany({
      where: { role: { in: ['SALES', 'ADMIN'] } },
      select: { id: true, name: true, email: true, assignedLeads: { where: { archived: false }, select: { status: true, quotedPrice: true } } },
    }),
  ])
  const closed = won + lost
  const [{ all: leadTasks, leads: taskLeads }, meetingTasks] = await Promise.all([tasksForUser({ id: '', role: 'ADMIN' }), loadMeetingTasks()])
  const byPerson = new Map<string, { lead: number; overdue: number; meeting: typeof meetingTasks }>()
  const slot = (id: string): { lead: number; overdue: number; meeting: typeof meetingTasks } => byPerson.get(id) ?? byPerson.set(id, { lead: 0, overdue: 0, meeting: [] }).get(id)!
  for (const t of leadTasks.filter((x) => !x.done)) {
    const o = taskOwner(t, taskLeads.get(t.leadId)?.assignedToId) ?? 'none'
    const e = slot(o)
    e.lead++
    if (t.dueAt && t.dueAt < now) e.overdue++
  }
  for (const t of meetingTasks.filter((x) => !x.done)) slot(t.assigneeId ?? 'none').meeting.push(t)
  const nameById = new Map(reps.map((r) => [r.id, r.name ?? r.email ?? 'Teammate']))
  const openTasks = [...byPerson.entries()]
    .map(([id, v]) => ({ id, name: id === 'none' ? 'Unassigned' : (nameById.get(id) ?? 'Former teammate'), ...v, total: v.lead + v.meeting.length }))
    .sort((a, b) => b.total - a.total)
  const owed = commissionRows.reduce((t, r) => {
    const s = commissionStatus(r)
    return { total: t.total + s.total, paid: t.paid + s.paid, payable: t.payable + s.payable, pending: t.pending + s.pending }
  }, { total: 0, paid: 0, payable: 0, pending: 0 })
  const tiles: { label: string; value: string | number; href: string; hint?: string; tone?: string }[] = [
    { label: 'Open deals', value: total - won - lost, href: '/sales/board' },
    { label: 'Pipeline value', value: `₪${formatMoney(openValue._sum.quotedPrice ?? 0)}`, href: '/sales/board' },
    { label: 'Leads', value: total, href: '/sales/leads' },
    { label: 'New this week', value: newWeek, href: '/sales/leads' },
    { label: 'Waiting for an owner', value: unassigned, href: '/sales/leads?assignee=none', tone: unassigned ? 'text-amber-300' : undefined },
    { label: `Quiet > ${staleDays} days`, value: staleCount, href: '/sales/today', tone: staleCount ? 'text-amber-300' : undefined },
    { label: 'Won', value: won, href: '/sales/leads?status=WON' },
    { label: 'Revenue (won deals)', value: `₪${formatMoney(wonValue._sum.quotedPrice ?? 0)}`, href: '/sales/leads?status=WON' },
    { label: 'Win rate (closed deals)', value: closed ? `${Math.round((won / closed) * 100)}%` : '—', href: '/sales/reports' },
    { label: 'Meetings next 24h', value: today, href: '/sales' },
    { label: 'Awaiting approval', value: pendingApprovals, href: '/admin/bookings', tone: pendingApprovals ? 'text-amber-300' : undefined },
  ]
  const board = reps
    .map((r) => ({
      name: r.name ?? r.email ?? 'Teammate',
      open: r.assignedLeads.filter((l) => l.status !== 'WON' && l.status !== 'LOST').length,
      won: r.assignedLeads.filter((l) => l.status === 'WON').length,
      value: r.assignedLeads.filter((l) => l.status === 'WON').reduce((n, l) => n + (l.quotedPrice ?? 0), 0),
    }))
    .sort((a, b) => b.value - a.value || b.won - a.won)

  return (
    <div className="space-y-6">
      <PageIntro title="Overview" hint="A snapshot of the whole business: leads, pipeline, meetings and how each teammate is doing. Click any number to dig in." />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/40">
            <div className={`text-2xl font-semibold tabular-nums ${t.tone ?? ''}`}>{t.value}</div>
            <div className="text-xs text-muted-foreground">{t.label}</div>
          </Link>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Commission owed to salespeople</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total owed', value: owed.total, tone: '' },
              { label: 'Paid', value: owed.paid, tone: 'text-emerald-400' },
              { label: 'Payable now', value: owed.payable, tone: owed.payable ? 'text-amber-300' : '' },
              { label: 'Pending (client has not paid yet)', value: owed.pending, tone: '' },
            ].map((t) => (
              <div key={t.label} className="rounded-lg border p-3">
                <div className={`text-xl font-semibold tabular-nums ${t.tone}`}>₪{formatMoney(t.value)}</div>
                <div className="text-xs text-muted-foreground">{t.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Open tasks by teammate</CardTitle>
        </CardHeader>
        <CardContent>
          {openTasks.length === 0 ? <p className="text-sm text-muted-foreground">Nobody has open tasks.</p> : null}
          <div className="divide-y">
            {openTasks.map((p) => (
              <details key={p.id} className="py-2 text-sm">
                <summary className="flex cursor-pointer items-center justify-between gap-3">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground">
                    <span className="tabular-nums text-foreground">{p.total}</span> open{p.overdue ? <span className="text-red-400"> · {p.overdue} overdue</span> : null}
                    {p.lead ? ` · ${p.lead} on contacts` : ''}
                    {p.meeting.length ? ` · ${p.meeting.length} from meetings` : ''}
                  </span>
                </summary>
                <div className="mt-1 divide-y pl-2">
                  {p.meeting.map((t) => (
                    <MeetingTaskRow key={t.id} ownerId={p.id} taskId={t.id} title={t.title} meeting={t.meetingTitle} done={false} />
                  ))}
                  {p.lead ? (
                    <Link href="/sales/tasks?scope=all" className="block py-2 text-xs text-primary hover:underline">
                      See the {p.lead} contact task{p.lead === 1 ? '' : 's'} →
                    </Link>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Team leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="pb-2 font-normal">Teammate</th>
                  <th className="pb-2 text-right font-normal">Open</th>
                  <th className="pb-2 text-right font-normal">Won</th>
                  <th className="pb-2 text-right font-normal">Won value</th>
                </tr>
              </thead>
              <tbody>
                {board.map((r, i) => (
                  <tr key={r.name + i} className="border-t">
                    <td className="py-2">
                      {i === 0 && r.value > 0 ? '🏆 ' : ''}
                      {r.name}
                    </td>
                    <td className="py-2 text-right tabular-nums">{r.open}</td>
                    <td className="py-2 text-right tabular-nums">{r.won}</td>
                    <td className="py-2 text-right tabular-nums">{formatMoney(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {board.length === 0 ? <p className="text-sm text-muted-foreground">No sales teammates yet.</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>Latest leads</span>
              <Link href="/sales/leads" className="text-sm font-normal text-primary underline-offset-4 hover:underline">
                All contacts →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {recentLeads.length === 0 ? <p className="text-sm text-muted-foreground">No leads yet.</p> : null}
            {recentLeads.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/sales/leads/${l.id}`} className="min-w-0 truncate font-medium underline-offset-4 hover:underline">
                  {leadName(l)}
                  {l.company ? <span className="font-normal text-muted-foreground"> · {l.company}</span> : null}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {l.assignedTo ? (l.assignedTo.name ?? l.assignedTo.email) : 'unassigned'} · {timeAgo(l.createdAt, now)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
