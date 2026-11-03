import Link from 'next/link'
import { PageIntro } from '@/components/PageIntro'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { requireUser } from '@/lib/auth'
import { formatMoney, timeAgo } from '@/lib/format'
import { loadRepStats } from '@/lib/team-stats'
import { rankReps } from '@/lib/team-metrics'

export const metadata = { title: 'Sales team' }
export const dynamic = 'force-dynamic'

export default async function TeamPerformancePage(): Promise<React.ReactElement> {
  const me = await requireUser(['ADMIN'])
  const reps = rankReps(await loadRepStats(me))
  const best = reps[0]
  const now = new Date()
  const totals = reps.reduce((t, r) => ({ won: t.won + r.won, value: t.value + r.wonValue, tasks: t.tasks + r.openTasks, overdue: t.overdue + r.overdueTasks }), { won: 0, value: 0, tasks: 0, overdue: 0 })
  return (
    <div className="space-y-6">
      <PageIntro title="Sales team" hint="Who is closing the most, what is on their plate, and a place to keep their details up to date. Click a name for the full picture." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Top performer', value: best && best.wonValue > 0 ? best.name : '—', sub: best && best.wonValue > 0 ? `₪${formatMoney(best.wonValue)} won` : 'No wins yet' },
          { label: 'Deals won (all reps)', value: String(totals.won), sub: `₪${formatMoney(totals.value)} in total` },
          { label: 'Open tasks', value: String(totals.tasks), sub: totals.overdue > 0 ? `${totals.overdue} overdue` : 'None overdue' },
          { label: 'Salespeople', value: String(reps.length), sub: `${reps.filter((r) => r.active).length} active` },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-[var(--card-pad)]">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <div className="mt-1 truncate text-2xl font-semibold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {reps.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">No salespeople yet. Add one under Team and they will show up here once they sign in.</p>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>#</TH>
              <TH>Salesperson</TH>
              <TH className="text-right">Won (₪)</TH>
              <TH className="text-right">Deals</TH>
              <TH className="text-right">Last 30 days</TH>
              <TH className="text-right">Win rate</TH>
              <TH className="text-right">Open leads</TH>
              <TH className="text-right">Open tasks</TH>
              <TH className="text-right">Meetings</TH>
              <TH>Last active</TH>
            </tr>
          </THead>
          <TBody>
            {reps.map((r, i) => (
              <TR key={r.id}>
                <TD className="text-muted-foreground">{i + 1}</TD>
                <TD>
                  <Link href={`/admin/team/${r.id}`} className="font-medium underline-offset-4 hover:underline">
                    {r.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                  {!r.active ? <Badge variant="destructive">Inactive</Badge> : null}
                </TD>
                <TD className="text-right font-medium">{formatMoney(r.wonValue)}</TD>
                <TD className="text-right">{r.won}</TD>
                <TD className="text-right">
                  {r.won30} · ₪{formatMoney(r.wonValue30)}
                </TD>
                <TD className="text-right">{r.conversion == null ? '—' : `${r.conversion}%`}</TD>
                <TD className="text-right">{r.openLeads}</TD>
                <TD className="text-right">
                  {r.openTasks}
                  {r.overdueTasks > 0 ? <span className="ml-1 text-xs text-red-400">({r.overdueTasks} overdue)</span> : null}
                </TD>
                <TD className="text-right">{r.upcomingMeetings}</TD>
                <TD className="text-muted-foreground">{r.lastActive ? timeAgo(r.lastActive, now) : 'Never'}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  )
}
