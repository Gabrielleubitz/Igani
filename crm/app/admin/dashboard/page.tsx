import Link from 'next/link'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { formatMoney, leadName, timeAgo } from '@/lib/format'
import { prisma } from '@/lib/prisma'
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
  const [total, won, lost, unassigned, staleCount, newWeek, today, pendingApprovals, wonValue, openValue, recentLeads, reps] = await Promise.all([
    prisma.lead.count({ where: { archived: false } }),
    prisma.lead.count({ where: { archived: false, status: 'WON' } }),
    prisma.lead.count({ where: { archived: false, status: 'LOST' } }),
    prisma.lead.count({ where: { ...open, assignedToId: null } }),
    prisma.lead.count({ where: { ...open, updatedAt: { lt: stale } } }),
    prisma.lead.count({ where: { archived: false, createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } }),
    prisma.booking.count({ where: { status: 'CONFIRMED', startTime: { gte: now, lt: dayEnd } } }),
    prisma.booking.count({ where: { status: 'PENDING', source: 'PUBLIC_PAGE', startTime: { gt: now } } }),
    prisma.lead.aggregate({ where: { archived: false, status: 'WON' }, _sum: { dealValue: true } }),
    prisma.lead.aggregate({ where: open, _sum: { dealValue: true } }),
    prisma.lead.findMany({ where: { archived: false }, orderBy: { createdAt: 'desc' }, take: 6, include: { assignedTo: { select: { name: true, email: true } } } }),
    prisma.user.findMany({
      where: { role: { in: ['SALES', 'ADMIN'] } },
      select: { id: true, name: true, email: true, assignedLeads: { where: { archived: false }, select: { status: true, dealValue: true } } },
    }),
  ])
  const closed = won + lost
  const tiles: { label: string; value: string | number; href: string; hint?: string; tone?: string }[] = [
    { label: 'Contacts', value: total, href: '/sales/leads' },
    { label: 'New this week', value: newWeek, href: '/sales/leads' },
    { label: 'Waiting for an owner', value: unassigned, href: '/sales/leads?assignee=none', tone: unassigned ? 'text-amber-300' : undefined },
    { label: `Quiet > ${staleDays} days`, value: staleCount, href: '/sales/today', tone: staleCount ? 'text-amber-300' : undefined },
    { label: 'Open pipeline value', value: formatMoney(openValue._sum.dealValue ?? 0), href: '/sales/board' },
    { label: 'Won', value: won, href: '/sales/leads?status=WON' },
    { label: 'Won value', value: formatMoney(wonValue._sum.dealValue ?? 0), href: '/sales/leads?status=WON' },
    { label: 'Win rate (closed deals)', value: closed ? `${Math.round((won / closed) * 100)}%` : '—', href: '/sales/reports' },
    { label: 'Meetings next 24h', value: today, href: '/sales' },
    { label: 'Awaiting approval', value: pendingApprovals, href: '/admin/bookings', tone: pendingApprovals ? 'text-amber-300' : undefined },
  ]
  const board = reps
    .map((r) => ({
      name: r.name ?? r.email ?? 'Teammate',
      open: r.assignedLeads.filter((l) => l.status !== 'WON' && l.status !== 'LOST').length,
      won: r.assignedLeads.filter((l) => l.status === 'WON').length,
      value: r.assignedLeads.filter((l) => l.status === 'WON').reduce((n, l) => n + (l.dealValue ?? 0), 0),
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
