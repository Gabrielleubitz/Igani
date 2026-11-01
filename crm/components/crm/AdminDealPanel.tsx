'use client'

import type { LeadSourceType } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { recalculateWonCommission, saveCommissionOverrides, saveQuotedPrice, setCommissionMilestone, setLeadSourceType } from '@/app/actions/deals'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label, Select } from '@/components/ui/input'
import { type CommissionBreakdown, type CommissionTerms, calculateCommission, commissionStatus, formatIls } from '@/lib/commission'

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
  milestones: { downpaymentReceivedAt: string | null; finalPaymentReceivedAt: string | null; downpaymentPaidAt: string | null; finalPaidAt: string | null }
}

const SOURCE_LABEL: Record<LeadSourceType, string> = { COLD_CALL: 'Salesperson cold call', ADS: 'Ads', OTHER: 'Other' }
const today = (): string => new Date().toISOString().slice(0, 10)
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
      <Row label={`Downpayment milestone (${t.downpaymentSharePct}%)`} value={formatIls(b.downpayment)} />
      <Row label={`Final milestone (${Math.round((100 - t.downpaymentSharePct) * 100) / 100}%)`} value={formatIls(b.final)} />
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
    downpaymentSharePct: String(p.terms.downpaymentSharePct),
  })
  const [payDate, setPayDate] = useState(today())

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string): void =>
    start(async () => {
      const res = await fn()
      setMsg(res.ok ? { ok: true, text: ok } : { ok: false, text: res.error ?? 'Failed' })
      router.refresh()
    })

  const amount = Number(price.replace(/[^\d]/g, ''))
  const workingTerms = useMemo<CommissionTerms>(() => {
    const n = (v: string, d: number): number => (v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : d)
    return {
      baseRatePct: Math.min(100, n(ov.baseRatePct, p.terms.baseRatePct)),
      threshold: n(ov.threshold, p.terms.threshold),
      incrementSize: n(ov.incrementSize, p.terms.incrementSize),
      bonusPerIncrement: n(ov.bonusPerIncrement, p.terms.bonusPerIncrement),
      downpaymentSharePct: Math.min(100, n(ov.downpaymentSharePct, p.terms.downpaymentSharePct)),
    }
  }, [ov, p.terms])
  const live = amount > 0 ? calculateCommission(amount, workingTerms) : null
  const frozen = p.isWon && p.snapshot
  const m = p.milestones
  const status = frozen
    ? commissionStatus({
        commissionTotal: p.snapshot!.breakdown.total,
        commissionDownpayment: p.snapshot!.breakdown.downpayment,
        commissionFinal: p.snapshot!.breakdown.final,
        downpaymentReceivedAt: m.downpaymentReceivedAt ? new Date(m.downpaymentReceivedAt) : null,
        finalPaymentReceivedAt: m.finalPaymentReceivedAt ? new Date(m.finalPaymentReceivedAt) : null,
        downpaymentPaidAt: m.downpaymentPaidAt ? new Date(m.downpaymentPaidAt) : null,
        finalPaidAt: m.finalPaidAt ? new Date(m.finalPaidAt) : null,
      })
    : null

  const milestone = (key: 'DOWNPAYMENT' | 'FINAL', label: string, amountDue: number, received: string | null, paid: string | null): React.ReactElement => (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">{formatIls(amountDue)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {received ? (
          <>
            <span className="text-emerald-400">Client paid on {day(received)}</span>
            {!paid ? (
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setCommissionMilestone(p.leadId, { milestone: key, kind: 'received', date: null }), 'Undone.')}>
                Undo
              </Button>
            ) : null}
          </>
        ) : (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setCommissionMilestone(p.leadId, { milestone: key, kind: 'received', date: payDate }), `${label} received.`)}>
            {key === 'DOWNPAYMENT' ? 'Downpayment received' : 'Final payment received'}
          </Button>
        )}
      </div>
      {received ? (
        <div className="flex flex-wrap items-center gap-2">
          {paid ? (
            <>
              <span className="text-emerald-400">Commission paid out on {day(paid)}</span>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setCommissionMilestone(p.leadId, { milestone: key, kind: 'paid', date: null }), 'Undone.')}>
                Undo
              </Button>
            </>
          ) : (
            <>
              <span className="text-amber-300">Payable now: {formatIls(amountDue)}</span>
              <Button size="sm" disabled={pending} onClick={() => run(() => setCommissionMilestone(p.leadId, { milestone: key, kind: 'paid', date: payDate }), 'Marked as paid out.')}>
                Mark commission paid
              </Button>
            </>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Not payable until the client’s money is in.</p>
      )}
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
            <Button disabled={pending || (price.trim() === '' ? p.quotedPrice === null : amount === p.quotedPrice)} onClick={() => run(() => saveQuotedPrice(p.leadId, price.trim() === '' ? null : amount), 'Price saved.')}>
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">The price agreed with the client after the call. Salespeople never see it.</p>
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
                  <Label htmlFor="pay-date" className="text-xs">Date for the next action</Label>
                  <Input id="pay-date" type="date" className="h-8 w-40" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                </div>
                {milestone('DOWNPAYMENT', 'Downpayment milestone', p.snapshot!.breakdown.downpayment, m.downpaymentReceivedAt, m.downpaymentPaidAt)}
                {milestone('FINAL', 'Final milestone', p.snapshot!.breakdown.final, m.finalPaymentReceivedAt, m.finalPaidAt)}
                {live && (live.total !== p.snapshot!.breakdown.total || amount !== p.snapshot!.breakdown.amount) ? (
                  <p className="text-xs text-amber-300">The price or terms now would give {formatIls(live.total)}. Save the price, then recalculate to refresh the frozen commission.</p>
                ) : null}
                {!m.downpaymentReceivedAt && !m.finalPaymentReceivedAt ? null : <p className="text-xs text-muted-foreground">Client money is already in, so the commission only changes if you recalculate it yourself.</p>}
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
                    ['downpaymentSharePct', 'Downpayment share %'],
                  ] as const
                ).map(([k, label]) => (
                  <label key={k} className="space-y-1 text-xs text-muted-foreground">
                    {label}
                    <Input inputMode="decimal" value={ov[k]} onChange={(e) => setOv({ ...ov, [k]: e.target.value })} />
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-3">
                <Button size="sm" disabled={pending} onClick={() => run(() => saveCommissionOverrides(p.leadId, workingTerms), 'Terms for this deal saved.')}>
                  Save for this deal
                </Button>
                {p.overridden ? (
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => saveCommissionOverrides(p.leadId, null), 'Back to the salesperson’s terms.')}>
                    Back to {p.salesperson ?? 'saved'} terms
                  </Button>
                ) : null}
              </div>
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
