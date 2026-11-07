import { CommissionPayRow } from '@/components/admin/CommissionPayRow'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { formatIls } from '@/lib/commission'
import { loadPayoutRows } from '@/lib/payout-data'
import { groupPayouts } from '@/lib/payouts'

export const metadata = { title: 'Payouts' }
export const dynamic = 'force-dynamic'

const monthName = (key: string): string => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${key}-15T00:00:00Z`))
const day = (d: Date): string => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', dateStyle: 'medium' }).format(d)

/** Commissions the clients have paid for, by month, with the date each is due under the signed agreement, and any refunds to claw back. */
export default async function PayoutsPage(): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const { months, clawbacks } = groupPayouts(await loadPayoutRows())
  const now = new Date()
  return (
    <div className="space-y-5">
      <PageIntro title="Payouts" hint="Commissions are earned when the client has paid in full. Each month’s commissions are due within the business days written in the salesperson’s signed agreement." />
      {months.length === 0 && clawbacks.length === 0 ? <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing to pay right now.</p> : null}
      {months.map((m) => (
        <Card key={m.month}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-baseline justify-between gap-2">
              <span>Earned in {monthName(m.month)}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {formatIls(m.total)} ·{' '}
                {m.dueDate ? (
                  <span className={m.dueDate < now ? 'text-red-400' : ''}>due {day(m.dueDate)}{m.dueDate < now ? ' (overdue)' : ''}</span>
                ) : (
                  'no signed agreement on file: due date unknown'
                )}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {m.rows.map((r) => (
              <CommissionPayRow key={r.leadId} leadId={r.leadId} lead={r.lead} salesperson={r.salesperson} amount={r.amount} clientPaid paidOut={false} />
            ))}
          </CardContent>
        </Card>
      ))}
      {clawbacks.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Refunds to claw back</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0 text-sm">
            {clawbacks.map(({ row, withinWindow }) => (
              <div key={row.leadId} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div>
                  <a href={`/sales/leads/${row.leadId}`} className="font-medium underline-offset-4 hover:underline">{row.lead}</a>
                  <div className="text-xs text-muted-foreground">{row.salesperson} · paid {formatIls(row.amount)} · client refunded {row.refundedAt ? day(row.refundedAt) : ''}</div>
                </div>
                <span className={withinWindow === false ? 'text-xs text-muted-foreground' : 'text-xs text-amber-300'}>
                  {withinWindow === null ? 'No signed agreement to check the clawback window' : withinWindow ? `Within the ${row.clawbackDays}-day window: deduct from the next payout or ask for repayment` : `Outside the ${row.clawbackDays}-day window: the agreement does not claw this back`}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
