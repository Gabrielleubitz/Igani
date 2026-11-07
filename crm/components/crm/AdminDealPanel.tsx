'use client'

import type { LeadSourceType } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { addLeadPayment, deleteLeadPayment, recalculateWonCommission, saveCommissionOverrides, saveQuotedPrice, setBonusPaid, setLeadSourceType, setPaymentCommissionPaid, setPaymentRefund } from '@/app/actions/deals'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label, Select } from '@/components/ui/input'
import { parseShekels } from '@/lib/money'
import { type CommissionBreakdown, type CommissionTerms, bonusOf, calculateCommission, commissionStatus, formatIls } from '@/lib/commission'
import { DEFAULT_TIME_ZONE } from '@/lib/default-time-zone'
import { localDateKey } from '@/lib/time'

export interface DealPanelProps {
  leadId: string
  isWon: boolean
  quotedPrice: number | null
  sourceType: LeadSourceType
  salesperson: string | null
  /** The terms in force for this deal now (the salesperson's saved terms + any per-deal overrides) */
  terms: CommissionTerms
  /** The salesperson's own saved terms, to reset to */
  savedTerms: CommissionTerms
  overridden: boolean
  /** Frozen when the deal was won */
  snapshot: { terms: CommissionTerms; breakdown: CommissionBreakdown; at: string | null; overridden: boolean } | null
  /** The day the whole price was paid (the bonus becomes payable) and the day the bonus was paid out */
  payment: { finalPaymentReceivedAt: string | null; finalPaidAt: string | null }
  /** Every client payment, with the commission on it */
  payments: { id: string; amount: number; receivedAt: string; commission: number; commissionPaidAt: string | null; refundedAt: string | null }[]
}

const SOURCE_LABEL: Record<LeadSourceType, string> = { COLD_CALL: 'Salesperson cold call', ADS: 'Ads', OTHER: 'Other' }
const today = (): string => localDateKey(new Date(), DEFAULT_TIME_ZONE) // the team works on Israel time
const day = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString('en-GB') : '')

function Row({ label, value, strong = false }: { label: string; value: React.ReactNode; strong?: boolean }): React.ReactElement {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'border-t pt-2 text-base font-semibold' : 'text-sm'}`}>
      <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function Breakdown({ b, t }: { b: CommissionBreakdown; t: CommissionTerms }): React.ReactElement {
  return (
    <div className="space-y-1.5">
      <Row label={`Base: ${formatIls(b.baseAmount)} × ${t.baseRatePct}%`} value={formatIls(b.baseCommission)} />
      <Row label={`Completed increments (each ${formatIls(t.incrementSize)} above ${formatIls(t.threshold)})`} value={b.completedIncrements} />
      <Row label={`Bonus: ${b.completedIncrements} × ${formatIls(t.bonusPerIncrement)}`} value={formatIls(b.bonusTotal)} />
      <Row label="Total commission" value={formatIls(b.total)} strong />
    </div>
  )
}

/** Admin-only: the price agreed with the client, the live commission for the salesperson, and the client/payout milestones. */
export function AdminDealPanel(p: DealPanelProps): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [price, setPrice] = useState(p.quotedPrice != null ? String(p.quotedPrice) : '')
  const [open, setOpen] = useState(p.overridden)
  const [ov, setOv] = useState<Record<keyof CommissionTerms, string>>({
    baseRatePct: String(p.terms.baseRatePct),
    threshold: String(p.terms.threshold),
    incrementSize: String(p.terms.incrementSize),
    bonusPerIncrement: String(p.terms.bonusPerIncrement),
  })
  const [payDate, setPayDate] = useState(today())

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string): void =>
    start(async () => {
      const res = await fn()
      setMsg(res.ok ? { ok: true, text: ok } : { ok: false, text: res.error ?? 'Failed' })
      router.refresh()
    })

  const parsedPrice = parseShekels(price)
  const priceError = parsedPrice.ok ? null : parsedPrice.error
  const amount = parsedPrice.ok ? (parsedPrice.value ?? 0) : 0
  // Each override field must be a plain number (percentages 0-100); a typo is shown, never silently replaced by the old value.
  const termsProblem = useMemo<string | null>(() => {
    for (const [k, label] of [['baseRatePct', 'Base rate'], ['threshold', 'Threshold'], ['incrementSize', 'Increment size'], ['bonusPerIncrement', 'Bonus per increment']] as const) {
      const v = ov[k].replace(/[₪\s,]/g, '')
      if (v === '' || !/^\d+(\.\d+)?$/.test(v)) return `${label}: use a plain number.`
      if (k === 'baseRatePct' && Number(v) > 100) return 'Base rate: a percentage from 0 to 100.'
    }
    return null
  }, [ov])
  const workingTerms = useMemo<CommissionTerms>(() => {
    const n = (v: string, d: number): number => {
      const t = v.replace(/[₪\s,]/g, '')
      return /^\d+(\.\d+)?$/.test(t) ? Number(t) : d
    }
    return {
      baseRatePct: Math.min(100, n(ov.baseRatePct, p.terms.baseRatePct)),
      threshold: n(ov.threshold, p.terms.threshold),
      incrementSize: n(ov.incrementSize, p.terms.incrementSize),
      bonusPerIncrement: n(ov.bonusPerIncrement, p.terms.bonusPerIncrement),
    }
  }, [ov, p.terms])
  const live = amount > 0 ? calculateCommission(amount, workingTerms) : null
  const frozen = p.isWon && p.snapshot
  const m = p.payment
  const bonus = frozen ? bonusOf({ breakdown: p.snapshot!.breakdown }) : 0
  const status = frozen
    ? commissionStatus({
        commissionTotal: p.snapshot!.breakdown.total,
        bonus,
        finalPaymentReceivedAt: m.finalPaymentReceivedAt ? new Date(m.finalPaymentReceivedAt) : null,
        finalPaidAt: m.finalPaidAt ? new Date(m.finalPaidAt) : null,
        payments: p.payments.map((x) => ({ commission: x.commission, receivedAt: new Date(x.receivedAt), commissionPaidAt: x.commissionPaidAt ? new Date(x.commissionPaidAt) : null, refundedAt: x.refundedAt ? new Date(x.refundedAt) : null })),
      })
    : null
  const dealPrice = p.quotedPrice ?? 0
  const paidSoFar = p.payments.filter((x) => !x.refundedAt).reduce((n, x) => n + x.amount, 0)
  const [payAmount, setPayAmount] = useState('')
  const parsedPay = parseShekels(payAmount)

  const paymentsBox = (): React.ReactElement => (
    <div className="space-y-3 rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">Client payments</span>
        <span className="tabular-nums text-muted-foreground">
          {formatIls(paidSoFar)} of {formatIls(dealPrice)} paid
        </span>
      </div>
      {p.payments.length === 0 ? <p className="text-xs text-muted-foreground">No payment yet. The commission on each payment becomes payable as you record it.</p> : null}
      {p.payments.map((x, i) => (
        <div key={x.id} className="space-y-1.5 rounded-md bg-muted/40 p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Payment {i + 1}: <b className="tabular-nums">{formatIls(x.amount)}</b> on {day(x.receivedAt)}
            </span>
            <span className="tabular-nums">Commission {formatIls(x.commission)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {x.refundedAt ? (
              <>
                <span className="text-amber-300">Returned to the client on {day(x.refundedAt)}{x.commissionPaidAt ? ': claw back the commission' : ': commission cancelled'}</span>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setPaymentRefund(x.id, null), 'Refund undone.')}>Undo refund</Button>
              </>
            ) : x.commissionPaidAt ? (
              <>
                <span className="text-emerald-400">Commission paid out on {day(x.commissionPaidAt)}</span>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setPaymentCommissionPaid(x.id, null), 'Undone.')}>Undo</Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => window.confirm('Record that this payment was returned to the client? The commission already paid on it becomes an overpayment to claw back.') && run(() => setPaymentRefund(x.id, payDate), 'Refund recorded.')}>Refunded</Button>
              </>
            ) : (
              <>
                <span className="text-amber-300">Payable now: {formatIls(x.commission)}</span>
                <Button size="sm" disabled={pending} onClick={() => run(() => setPaymentCommissionPaid(x.id, payDate), 'Marked as paid out.')}>Mark paid</Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => window.confirm('Record that this payment was returned to the client? Its commission is cancelled.') && run(() => setPaymentRefund(x.id, payDate), 'Refund recorded.')}>Refunded</Button>
                {i === p.payments.length - 1 ? (
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => window.confirm('Remove this payment? Use this only if it was entered by mistake.') && run(() => deleteLeadPayment(x.id), 'Payment removed.')}>Remove</Button>
                ) : null}
              </>
            )}
          </div>
        </div>
      ))}
      {bonus > 0 ? (
        <div className="space-y-1.5 rounded-md bg-muted/40 p-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Bonus (paid only once the whole price is paid)</span>
            <span className="tabular-nums">{formatIls(bonus)}</span>
          </div>
          {!m.finalPaymentReceivedAt ? (
            <p className="text-xs text-muted-foreground">Not payable yet: {formatIls(Math.max(0, dealPrice - paidSoFar))} of the price is still to be paid.</p>
          ) : m.finalPaidAt ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-emerald-400">Bonus paid out on {day(m.finalPaidAt)}</span>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setBonusPaid(p.leadId, null), 'Undone.')}>Undo</Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-amber-300">Payable now: {formatIls(bonus)}</span>
              <Button size="sm" disabled={pending} onClick={() => run(() => setBonusPaid(p.leadId, payDate), 'Bonus marked as paid out.')}>Mark bonus paid</Button>
            </div>
          )}
        </div>
      ) : null}
      {paidSoFar < dealPrice ? (
        <div className="flex flex-wrap items-end gap-2 border-t pt-3">
          <label className="space-y-1 text-xs text-muted-foreground">
            Client paid (₪)
            <Input inputMode="numeric" className="h-8 w-32" placeholder={String(Math.max(0, dealPrice - paidSoFar))} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
          </label>
          <Button
            size="sm"
            disabled={pending || !parsedPay.ok || !parsedPay.value}
            onClick={() => {
              if (!parsedPay.ok || !parsedPay.value) return
              run(() => addLeadPayment(p.leadId, { amount: parsedPay.value!, date: payDate }), 'Payment recorded.')
              setPayAmount('')
            }}
          >
            Add payment
          </Button>
          {!parsedPay.ok ? <span className="text-xs text-red-400">{parsedPay.error}</span> : null}
        </div>
      ) : null}
    </div>
  )

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Deal &amp; commission <span className="text-xs font-normal text-muted-foreground">(admins only)</span></CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="quoted-price">Quoted price (₪)</Label>
          <div className="flex gap-2">
            <Input id="quoted-price" inputMode="numeric" placeholder="e.g. 17000" value={price} onChange={(e) => setPrice(e.target.value)} />
            <Button
              disabled={pending || !parsedPrice.ok || (price.trim() === '' ? p.quotedPrice === null : amount === p.quotedPrice)}
              onClick={() =>
                start(async () => {
                  const res = await saveQuotedPrice(p.leadId, price.trim() === '' ? null : amount)
                  setMsg(res.ok ? { ok: true, text: res.data.movedToProposal ? 'Price saved. The lead moved to Proposal sent.' : 'Price saved.' } : { ok: false, text: res.error })
                  router.refresh()
                })
              }
            >
              Save
            </Button>
          </div>
          {priceError ? <p className="text-xs text-red-400">{priceError}</p> : null}
          <p className="text-xs text-muted-foreground">The price agreed with the client after the call. Saving a price moves the lead to Proposal sent. Salespeople never see it.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="source-type">Lead source</Label>
          <Select id="source-type" disabled={pending} value={p.sourceType} onChange={(e) => run(() => setLeadSourceType(p.leadId, e.target.value as LeadSourceType), 'Lead source saved.')}>
            {(Object.keys(SOURCE_LABEL) as LeadSourceType[]).map((k) => (
              <option key={k} value={k}>
                {SOURCE_LABEL[k]}
              </option>
            ))}
          </Select>
        </div>

        {live || frozen ? (
          <section className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4" aria-label="Salesperson commission">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">Salesperson Commission</h3>
              <span className="text-xs text-muted-foreground">{p.salesperson ?? 'No salesperson assigned (default terms)'}</span>
            </div>
            {frozen ? (
              <>
                <p className="text-xs text-muted-foreground">
                  Frozen when the deal was won{p.snapshot!.at ? ` on ${day(p.snapshot!.at)}` : ''}{p.snapshot!.overridden ? ', with terms changed for this deal' : ''}. Later changes to {p.salesperson ?? 'the'} terms don’t change it.
                </p>
                <Breakdown b={p.snapshot!.breakdown} t={p.snapshot!.terms} />
                {status ? (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-emerald-500/10 p-2"><div className="text-base font-semibold tabular-nums">{formatIls(status.paid)}</div>Paid</div>
                    <div className="rounded-md bg-amber-500/10 p-2"><div className="text-base font-semibold tabular-nums">{formatIls(status.payable)}</div>Payable</div>
                    <div className="rounded-md bg-muted p-2"><div className="text-base font-semibold tabular-nums">{formatIls(status.pending)}</div>Pending</div>
                  </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <Label htmlFor="pay-date" className="text-xs">Date for the next payment or payout</Label>
                  <Input id="pay-date" type="date" className="h-8 w-40" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
                {paymentsBox()}
                {live && (live.total !== p.snapshot!.breakdown.total || amount !== p.snapshot!.breakdown.amount) ? (
                  <p className="text-xs text-amber-300">The price or terms now would give {formatIls(live.total)}. Save the price, then recalculate to refresh the frozen commission.</p>
                ) : null}
                {p.payments.length === 0 ? null : <p className="text-xs text-muted-foreground">A client payment is recorded, and each payment’s commission was fixed when you entered it. Remove the payments first if the price or commission has to change.</p>}
                <Button size="sm" variant="outline" disabled={pending} onClick={() => window.confirm('Recalculate this deal’s commission from the current price and terms?') && run(() => recalculateWonCommission(p.leadId), 'Commission recalculated.')}>
                  Recalculate
                </Button>
              </>
            ) : live ? (
              <>
                <Breakdown b={live} t={workingTerms} />
                {p.isWon ? (
                  <>
                    <p className="text-xs text-amber-300">This deal was won before commissions existed, so nothing is frozen yet. Save the price, then freeze it.</p>
                    <Button size="sm" disabled={pending || p.quotedPrice === null} onClick={() => run(() => recalculateWonCommission(p.leadId), 'Commission frozen.')}>
                      Freeze commission now
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Updates as you type. It is frozen the moment the deal is marked Won.</p>
                )}
              </>
            ) : null}

            <details open={open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)} className="pt-1">
              <summary className="cursor-pointer select-none text-xs font-medium text-primary hover:underline">Change the terms for this deal only{p.overridden ? ' (currently changed)' : ''}</summary>
              <div className="grid grid-cols-2 gap-2 pt-3">
                {(
                  [
                    ['baseRatePct', 'Base rate %'],
                    ['threshold', 'Threshold ₪'],
                    ['incrementSize', 'Increment size ₪'],
                    ['bonusPerIncrement', 'Bonus per increment ₪'],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="space-y-1 text-xs text-muted-foreground">
                    {label}
                    <Input inputMode="decimal" value={ov[k]} onChange={(e) => setOv({ ...ov, [k]: e.target.value })} />
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-3">
                <Button size="sm" disabled={pending || termsProblem !== null} onClick={() => run(() => saveCommissionOverrides(p.leadId, workingTerms), 'Terms for this deal saved.')}>
                  Save for this deal
                </Button>
                {p.overridden ? (
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => saveCommissionOverrides(p.leadId, null), 'Back to the salesperson’s terms.')}>
                    Back to {p.salesperson ?? 'saved'} terms
                  </Button>
                ) : null}
              </div>
              {termsProblem ? <p className="pt-2 text-xs text-red-400">{termsProblem}</p> : null}
              <p className="pt-2 text-xs text-muted-foreground">This never changes the salesperson’s saved terms.</p>
            </details>
          </section>
        ) : null}
        {msg ? <p className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p> : null}
      </CardContent>
    </Card>
  )
}

/** What a salesperson sees for one of their won deals: only the commission, what is paid and what is still to come. */
export function MyCommissionCard({ total, paid, pending }: { total: number; paid: number; pending: number }): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Your commission</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tabular-nums">{formatIls(total)}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
          <div className="rounded-md bg-emerald-500/10 p-2"><div className="text-base font-semibold tabular-nums">{formatIls(paid)}</div>Paid so far</div>
          <div className="rounded-md bg-muted p-2"><div className="text-base font-semibold tabular-nums">{formatIls(pending)}</div>Pending</div>
        </div>
      </CardContent>
    </Card>
  )
}
