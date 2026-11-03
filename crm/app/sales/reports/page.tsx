import { commissionStatus, formatIls } from '@/lib/commission'
import { buildReport } from '@/components/crm/crm-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { LEAD_STATUSES, STATUS_LABEL, formatMoney } from '@/lib/format'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { localDateKey } from '@/lib/time'
import { PageIntro } from '@/components/PageIntro'

export const metadata = { title: 'Analytics' }

export const dynamic = 'force-dynamic'

export default async function ReportsPage({ searchParams }: { searchParams: { scope?: string } }): Promise<React.ReactElement> {
  const user = await requireUser()
  // Salespeople only ever see their own numbers; admins can switch between the whole team and just themselves.
  const mine = user.role === 'SALES' || (searchParams.scope === 'mine' && user.role === 'ADMIN')
  const now = Date.now()
  const d30 = new Date(now - 30 * 864e5)
  const d60 = new Date(now - 60 * 864e5)
  const [allLeads, commissionRows, users, bookings, closeLogs, me] = await Promise.all([
    prisma.lead.findMany({ where: { ...(mine ? { assignedToId: user.id } : {}) }, select: { id: true, status: true, source: true, assignedToId: true, createdAt: true, quotedPrice: true, lostReason: true } }),
    // Commission on my own won deals. These columns are all a salesperson ever gets; no prices, no terms.
    prisma.lead.findMany({
      where: { status: 'WON', commissionTotal: { not: null }, ...(user.role === 'ADMIN' ? (mine ? { assignedToId: user.id } : {}) : { assignedToId: user.id }) },
      select: { commissionTotal: true, finalPaymentReceivedAt: true, finalPaidAt: true },
    }),
    prisma.user.findMany({ where: user.role === 'SALES' ? { id: user.id } : {}, select: { id: true, name: true, email: true } }),
    prisma.booking.findMany({ where: { endTime: { lt: new Date(now), gte: d60 }, leadId: { not: null }, ...(mine ? { hostId: user.id } : {}) }, select: { status: true, endTime: true } }),
    // When deals were actually won or lost (from the stage-change history, not "last edited").
    prisma.activityLog.findMany({
      where: { entityType: 'LEAD', action: 'lead.status_changed', OR: [{ metadata: { path: ['to'], equals: 'WON' } }, { metadata: { path: ['to'], equals: 'LOST' } }] },
      select: { entityId: true, createdAt: true, metadata: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
  ])
  // Latest close event per lead (a deal reopened and won again counts at its latest win).
  const closedAt = new Map<string, { to: string; at: Date }>()
  for (const l of closeLogs) closedAt.set(l.entityId, { to: String((l.metadata as { to?: string } | null)?.to), at: l.createdAt })
  const leads = allLeads.map((l) => {
    const c = closedAt.get(l.id)
    const at = c && c.to === l.status ? c.at : null
    return { ...l, quotedPrice: user.role === 'ADMIN' ? l.quotedPrice : null, wonAt: l.status === 'WON' ? at : null, lostAt: l.status === 'LOST' ? at : null }
  })
  // Each metric for the window [from, to). Comparing two windows is fair: both measure what happened inside them.
  const window = (from: Date, to: Date): { added: number; won: number; winRate: number | null; kept: number | null } => {
    const inW = (d: Date | null): boolean => Boolean(d && d >= from && d < to)
    const wonL = leads.filter((l) => inW(l.wonAt))
    const lostL = leads.filter((l) => inW(l.lostAt))
    const bk = bookings.filter((b) => b.endTime >= from && b.endTime < to && b.status !== 'PENDING')
    return {
      added: leads.filter((l) => inW(l.createdAt)).reduce((n, l) => n + (l.quotedPrice ?? 0), 0),
      won: wonL.reduce((n, l) => n + (l.quotedPrice ?? 0), 0),
      winRate: wonL.length + lostL.length ? Math.round((wonL.length / (wonL.length + lostL.length)) * 100) : null,
      kept: bk.length ? Math.round((bk.filter((b) => b.status === 'CONFIRMED').length / bk.length) * 100) : null,
    }
  }
  const cur = window(d30, new Date(now + 1))
  const prev = window(d60, d30)
  const totalPipeline = leads.filter((l) => l.status !== 'WON' && l.status !== 'LOST').reduce((n, l) => n + (l.quotedPrice ?? 0), 0)
  const commission = commissionRows.reduce((t, r) => {
    const s = commissionStatus(r)
    return { total: t.total + s.total, paid: t.paid + s.paid, payable: t.payable + s.payable, pending: t.pending + s.pending }
  }, { total: 0, paid: 0, payable: 0, pending: 0 })
  /** Change in an amount, as a percentage of the previous period. */
  const delta = (a: number, b: number): string => (b === 0 ? (a === 0 ? 'same as prev 30d' : 'new vs prev 30d') : `${a >= b ? '▲' : '▼'} ${Math.abs(Math.round(((a - b) / b) * 100))}% vs prev 30d`)
  /** Change in a rate, in percentage points (2% → 3% is +1 pt, not +50%). */
  const deltaPts = (a: number | null, b: number | null): string => (a === null || b === null ? 'no data for prev 30d' : `${a >= b ? '▲' : '▼'} ${Math.abs(a - b)} pts vs prev 30d`)
  const names = new Map(users.map((u) => [u.id, u.name ?? u.email ?? u.id]))
  const r = buildReport(leads, (id) => (id ? (names.get(id) ?? 'Unknown') : 'Unassigned'), new Date(now), 30, (d) => localDateKey(d, me.timeZone))
  const maxDay = Math.max(1, ...r.perDay.map((d) => d.count))
  const maxStage = Math.max(1, ...Object.values(r.byStatus))
  const last30 = r.perDay.reduce((n, d) => n + d.count, 0)
  const lostReasons = [...leads.filter((l) => l.status === 'LOST').reduce((m, l) => m.set((l.lostReason ?? 'No reason').split(':')[0]!.trim(), (m.get((l.lostReason ?? 'No reason').split(':')[0]!.trim()) ?? 0) + 1), new Map<string, number>())].sort((a, b) => b[1] - a[1])
  const maxLost = Math.max(1, ...lostReasons.map(([, n]) => n))

  const Tile = ({ label, value, sub }: { label: string; value: string | number; sub?: string }): React.ReactElement => (
    <Card>
      <CardContent className="pt-[var(--card-pad)]">
        <div className="text-3xl font-semibold">{value}</div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageIntro title="Analytics" hint={mine && user.role === 'SALES' ? 'How many of your leads you have, where they come from, and how many you win. Archived contacts are left out.' : 'How many leads there are, where they come from, and how many are won. Archived contacts are left out.'} />
        {user.role === 'ADMIN' ? (
          <div className="flex gap-1">
            <Link href="/sales/reports" className={`rounded-full border px-3 py-1 text-sm ${!mine ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
              Whole team
            </Link>
            <Link href="/sales/reports?scope=mine" className={`rounded-full border px-3 py-1 text-sm ${mine ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
              Just me
            </Link>
          </div>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile label="Total leads" value={r.total} />
        <Tile label="New (last 30 days)" value={last30} />
        <Tile label="Won" value={r.byStatus.WON ?? 0} />
        <Tile label="Win rate (all time)" value={r.winRate === null ? '—' : `${Math.round(r.winRate * 100)}%`} />
      </div>

      {user.role !== 'ADMIN' ? (
        // A salesperson's own commission: total, what has been paid, and what is still to come, each in its own box.
        <div className="grid gap-4 sm:grid-cols-3">
          <Tile label="My commission (total)" value={formatIls(commission.total)} sub={`${commissionRows.length} won deal${commissionRows.length === 1 ? '' : 's'}`} />
          <Tile label="Paid" value={formatIls(commission.paid)} sub="Already paid to you" />
          <Tile label="Pending" value={formatIls(commission.total - commission.paid)} sub="Still to come" />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {user.role === 'ADMIN' ? (
          <>
            <Tile label="Pipeline value" value={`₪${formatMoney(totalPipeline)}`} sub={`Quoted price added (30d): ₪${formatMoney(cur.added)} · ${delta(cur.added, prev.added)}`} />
            <Tile label="Revenue, won deals (30d)" value={`₪${formatMoney(cur.won)}`} sub={delta(cur.won, prev.won)} />
          </>
        ) : null}
        <Tile label="Win rate (closed in 30d)" value={cur.winRate === null ? '—' : `${cur.winRate}%`} sub={`${deltaPts(cur.winRate, prev.winRate)} · won ÷ (won + lost)`} />
        <Tile label="Meetings kept (30d)" value={cur.kept === null ? '—' : `${cur.kept}%`} sub={`${deltaPts(cur.kept, prev.kept)} · past meetings not cancelled`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {LEAD_STATUSES.map((s) => (
            <div key={s} className="flex items-center gap-3 text-sm">
              <Link href={`/sales/leads?status=${s}`} className="w-36 text-muted-foreground hover:text-foreground">
                {STATUS_LABEL[s]}
              </Link>
              <div className="h-4 flex-1 rounded bg-muted">
                <div className={`h-4 rounded ${s === 'LOST' ? 'bg-rose-500/70' : s === 'WON' ? 'bg-emerald-500/80' : 'bg-primary'}`} style={{ width: `${((r.byStatus[s] ?? 0) / maxStage) * 100}%` }} />
              </div>
              <span className="w-10 text-right tabular-nums">{r.byStatus[s] ?? 0}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {lostReasons.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Why deals are lost</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lostReasons.map(([reason, n]) => (
              <div key={reason} className="flex items-center gap-3 text-sm">
                <span className="w-40 truncate text-muted-foreground" title={reason}>
                  {reason}
                </span>
                <div className="h-3 flex-1 rounded bg-muted">
                  <div className="h-3 rounded bg-rose-500/70" style={{ width: `${(n / maxLost) * 100}%` }} />
                </div>
                <span className="w-10 text-right tabular-nums">{n}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Leads per day (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-end gap-1" role="img" aria-label="Leads per day">
            {r.perDay.map((d) => (
              <div key={d.day} title={`${d.day}: ${d.count}`} className="flex-1 rounded-t bg-primary/80" style={{ height: `${Math.max(2, (d.count / maxDay) * 100)}%` }} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {(
          [
            ['By source', r.bySource.map((x) => [x.source, x.total, x.won] as const)],
            ...(mine ? [] : ([['By owner', r.byOwner.map((x) => [x.owner, x.total, x.won] as const)]] as const)),
          ] as const
        ).map(([title, rows]) => (
          <Card key={title}>
            <CardHeader>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-normal">Name</th>
                    <th className="pb-2 text-right font-normal">Leads</th>
                    <th className="pb-2 text-right font-normal">Won</th>
                    <th className="pb-2 text-right font-normal">Win %</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([name, total, won]) => (
                    <tr key={name} className="border-t">
                      <td className="py-1.5">{name}</td>
                      <td className="py-1.5 text-right">{total}</td>
                      <td className="py-1.5 text-right">{won}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{total ? `${Math.round((won / total) * 100)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
