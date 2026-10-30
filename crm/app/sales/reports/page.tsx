import { CrmSubNav } from '@/components/crm/CrmSubNav'
import { buildReport } from '@/components/crm/crm-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { LEAD_STATUSES } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Reports' }

export default async function ReportsPage(): Promise<React.ReactElement> {
  const user = await requireUser()
  void user
  const now = Date.now()
  const d30 = new Date(now - 30 * 864e5)
  const d60 = new Date(now - 60 * 864e5)
  const [leads, users, bookings] = await Promise.all([
    prisma.lead.findMany({ select: { status: true, source: true, assignedToId: true, createdAt: true, updatedAt: true, dealValue: true } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true } }),
    prisma.booking.findMany({ where: { endTime: { lt: new Date(now), gte: d60 } }, select: { status: true, endTime: true } }),
  ])
  // Metrics for [from, to): open pipeline value, won revenue, conversion, and held-meeting rate (past meetings not cancelled).
  const window = (from: Date, to: Date): { pipeline: number; won: number; conversion: number; held: number } => {
    const created = leads.filter((l) => l.createdAt >= from && l.createdAt < to)
    const wonLeads = leads.filter((l) => l.status === 'WON' && l.updatedAt >= from && l.updatedAt < to)
    const bk = bookings.filter((b) => b.endTime >= from && b.endTime < to && b.status !== 'PENDING')
    return {
      pipeline: created.filter((l) => l.status !== 'WON' && l.status !== 'LOST').reduce((n, l) => n + (l.dealValue ?? 0), 0),
      won: wonLeads.reduce((n, l) => n + (l.dealValue ?? 0), 0),
      conversion: created.length ? Math.round((created.filter((l) => l.status === 'WON').length / created.length) * 1000) / 10 : 0,
      held: bk.length ? Math.round((bk.filter((b) => b.status === 'CONFIRMED').length / bk.length) * 100) : 0,
    }
  }
  const cur = window(d30, new Date(now + 1))
  const prev = window(d60, d30)
  const totalPipeline = leads.filter((l) => l.status !== 'WON' && l.status !== 'LOST').reduce((n, l) => n + (l.dealValue ?? 0), 0)
  const delta = (a: number, b: number): string => (b === 0 ? (a === 0 ? '—' : 'new') : `${a >= b ? '▲' : '▼'} ${Math.abs(Math.round(((a - b) / b) * 100))}% vs prev 30d`)
  const names = new Map(users.map((u) => [u.id, u.name ?? u.email ?? u.id]))
  const r = buildReport(leads, (id) => (id ? (names.get(id) ?? 'Unknown') : 'Unassigned'))
  const maxDay = Math.max(1, ...r.perDay.map((d) => d.count))
  const maxStage = Math.max(1, ...Object.values(r.byStatus))
  const last30 = r.perDay.reduce((n, d) => n + d.count, 0)

  const Tile = ({ label, value, sub }: { label: string; value: string | number; sub?: string }): React.ReactElement => (
    <Card>
      <CardContent className="pt-6">
        <div className="text-3xl font-semibold">{value}</div>
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <CrmSubNav active="/sales/reports" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Total leads" value={r.total} />
        <Tile label="New (30 days)" value={last30} />
        <Tile label="Won" value={r.byStatus.WON ?? 0} />
        <Tile label="Win rate" value={r.winRate === null ? '—' : `${Math.round(r.winRate * 100)}%`} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Pipeline value (open)" value={totalPipeline.toLocaleString()} sub={`New 30d: ${cur.pipeline.toLocaleString()} · ${delta(cur.pipeline, prev.pipeline)}`} />
        <Tile label="Won revenue (30d)" value={cur.won.toLocaleString()} sub={delta(cur.won, prev.won)} />
        <Tile label="Conversion (30d cohort)" value={`${cur.conversion}%`} sub={delta(cur.conversion, prev.conversion)} />
        <Tile label="Meeting show-up rate (30d)" value={`${cur.held}%`} sub={`${delta(cur.held, prev.held)} · past meetings not cancelled`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {LEAD_STATUSES.map((s) => (
            <div key={s} className="flex items-center gap-3 text-sm">
              <span className="w-36 text-muted-foreground">{s.replace('_', ' ')}</span>
              <div className="h-4 flex-1 rounded bg-muted">
                <div className="h-4 rounded bg-primary" style={{ width: `${((r.byStatus[s] ?? 0) / maxStage) * 100}%` }} />
              </div>
              <span className="w-10 text-right">{r.byStatus[s] ?? 0}</span>
            </div>
          ))}
        </CardContent>
      </Card>

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
            ['By owner', r.byOwner.map((x) => [x.owner, x.total, x.won] as const)],
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
                  </tr>
                </thead>
                <tbody>
                  {rows.map(([name, total, won]) => (
                    <tr key={name} className="border-t">
                      <td className="py-1.5">{name}</td>
                      <td className="py-1.5 text-right">{total}</td>
                      <td className="py-1.5 text-right">{won}</td>
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
