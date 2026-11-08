import { Banknote, Briefcase, CalendarCheck, CalendarDays, CircleCheck, HandCoins, Hourglass, Target, Trophy, UserPlus, Users, Wallet } from 'lucide-react'
import { StatTile, Tag, type Tone } from '@/components/ui/tone'
import Link from 'next/link'
import { CommissionPayRow } from '@/components/admin/CommissionPayRow'
import { PageIntro } from '@/components/PageIntro'
import { LiveNow } from '@/components/calls/LiveNow'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { loadOverview } from '@/lib/admin-overview'
import { formatMoney, leadName, timeAgo } from '@/lib/format'
import { MeetingTaskRow } from '@/components/crm/MeetingTaskRow'

export const metadata = { title: 'Overview' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage(): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const now = new Date()
  const { staleDays, total, won, lost, unassigned, staleCount, newWeek, today, pendingApprovals, wonValue, openValue, closed, openTasks, payableRows, owed, recentLeads, board } = await loadOverview()
  const tiles: { label: string; value: string | number; href: string; icon: React.ReactNode; tone: Tone; tag?: React.ReactNode }[] = [
    { label: 'Open deals', value: total - won - lost, href: '/sales/board', icon: <Briefcase />, tone: 'blue' },
    { label: 'Pipeline value', value: `₪${formatMoney(openValue)}`, href: '/sales/board', icon: <Wallet />, tone: 'emerald' },
    { label: 'Leads', value: total, href: '/sales/leads', icon: <Users />, tone: 'sky', tag: newWeek ? <Tag tone="emerald">+{newWeek} this week</Tag> : undefined },
    { label: 'Waiting for an owner', value: unassigned, href: '/sales/leads?assignee=none', icon: <UserPlus />, tone: unassigned ? 'amber' : 'slate' },
    { label: `Quiet > ${staleDays} days`, value: staleCount, href: '/sales/today', icon: <Hourglass />, tone: staleCount ? 'orange' : 'slate' },
    { label: 'Won', value: won, href: '/sales/leads?status=WON', icon: <Trophy />, tone: 'amber' },
    { label: 'Revenue (won deals)', value: `₪${formatMoney(wonValue)}`, href: '/sales/leads?status=WON', icon: <Banknote />, tone: 'teal' },
    { label: 'Win rate (closed deals)', value: closed ? `${Math.round((won / closed) * 100)}%` : '—', href: '/sales/reports', icon: <Target />, tone: 'pink' },
    { label: 'Meetings next 24h', value: today, href: '/sales', icon: <CalendarDays />, tone: 'violet' },
    { label: 'Awaiting approval', value: pendingApprovals, href: '/admin/bookings', icon: <CalendarCheck />, tone: pendingApprovals ? 'rose' : 'slate', tag: pendingApprovals ? <Tag tone="rose">needs you</Tag> : undefined },
  ]
  return (
    <div className="space-y-6">
      {!process.env.CRON_SECRET ? (
        <div role="alert" className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <strong>Reminders and email sync are off.</strong> The hourly job needs a <code>CRON_SECRET</code> (at least 16 characters) in Vercel → Settings → Environment Variables, then a redeploy. Until then task reminders, follow-up tasks, meeting reminders, Gmail sync and Meet notes don’t run.
        </div>
      ) : null}
      <PageIntro title="Overview" hint="A snapshot of the whole business: leads, pipeline, meetings and how each teammate is doing. Click any number to dig in." />
      <LiveNow />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <StatTile key={t.label} href={t.href} icon={t.icon} tone={t.tone} label={t.label} value={t.value} tag={t.tag} />
        ))}
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Commission owed to salespeople</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                { label: 'Total owed', value: owed.total, tone: 'blue', icon: <Wallet /> },
                { label: 'Paid', value: owed.paid, tone: 'emerald', icon: <CircleCheck /> },
                { label: 'Payable now', value: owed.payable, tone: owed.payable ? 'amber' : 'slate', icon: <HandCoins /> },
                { label: 'Pending (not paid by the client yet)', value: owed.pending, tone: 'violet', icon: <Hourglass /> },
              ] satisfies { label: string; value: number; tone: Tone; icon: React.ReactNode }[]
            ).map((t) => (
              <StatTile key={t.label} icon={t.icon} tone={t.tone} label={t.label} value={`₪${formatMoney(t.value)}`} />
            ))}
          </div>
          {payableRows.length > 0 ? (
            <div className="mt-4 divide-y rounded-lg border">
              {payableRows.slice(0, 40).map((r) => (
                <CommissionPayRow key={r.paymentId ?? `${r.leadId}-bonus`} leadId={r.leadId} paymentId={r.paymentId} label={r.label} lead={r.lead} salesperson={r.salesperson} amount={r.amount} paidOut={false} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Nothing is payable right now. Each client payment you record on a deal shows up here.</p>
          )}
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
