'use client'

import type { LeadStatus } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { getDealCommissionTerms } from '@/app/actions/deals'
import { updateLeadStatus } from '@/app/actions/leads'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { LEAD_STATUSES, STATUS_LABEL } from '@/lib/format'
import { parseShekels } from '@/lib/money'
import { type CommissionTerms, calculateCommission, formatIls } from '@/lib/commission'
import { canEditAtStage, stagesFor } from '@/lib/stage-rules'
import { cn } from '@/lib/utils'

export const LOST_REASONS = ['Budget', 'Chose a competitor', 'No response', 'Timing / not now', 'Not a fit', 'Other'] as const

type Extras = { lostReason?: string; quotedPrice?: number }

/**
 * Hook behind every stage change in the CRM. Moving to Lost asks for a reason (required),
 * moving to Won (admins only) asks for the quoted price and shows the salesperson's commission live — in a proper dialog.
 */
export function useStageChange(onDone?: (res: { ok: boolean; error?: string }) => void): {
  request: (leadId: string, to: LeadStatus, currentValue?: number | null) => void
  pending: boolean
  error: string | null
  dialog: React.ReactElement
} {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ask, setAsk] = useState<{ leadId: string; to: 'WON' | 'LOST'; value: string } | null>(null)
  // Terms for the commission preview in the Won dialog (admins only; null until loaded)
  const [dealTerms, setDealTerms] = useState<{ terms: CommissionTerms; salesperson: string | null } | null>(null)
  const [reason, setReason] = useState<string>(LOST_REASONS[0])
  const [detail, setDetail] = useState('')

  const commit = (leadId: string, to: LeadStatus, extras: Extras = {}): void =>
    start(async () => {
      const res = await updateLeadStatus(leadId, to, extras)
      setError(res.ok ? null : res.error)
      onDone?.(res)
      router.refresh()
    })

  const request = (leadId: string, to: LeadStatus, currentValue?: number | null): void => {
    setError(null)
    if (to === 'WON' || to === 'LOST') {
      setReason(LOST_REASONS[0])
      setDetail('')
      setAsk({ leadId, to, value: currentValue ? String(currentValue) : '' })
      setDealTerms(null)
      if (to === 'WON') {
        void getDealCommissionTerms(leadId).then((res) => {
          if (res.ok) setDealTerms({ terms: res.data.terms, salesperson: res.data.salesperson })
        })
      }
    } else commit(leadId, to)
  }

  const close = (): void => setAsk(null)
  const priceParsed = ask?.to === 'WON' ? parseShekels(ask.value) : null
  const priceNow = priceParsed && priceParsed.ok ? (priceParsed.value ?? 0) : 0
  const dialog = (
    <Dialog
      open={ask !== null}
      onClose={close}
      title={ask?.to === 'WON' ? 'Mark as won 🎉' : 'Mark as lost'}
      description={ask?.to === 'WON' ? 'Nice work. Enter the quoted price (the price agreed with the client). The salesperson’s commission is calculated from it and frozen when you confirm.' : 'Pick a reason. It is saved on the contact and shows up in Reports.'}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ask) return
          if (ask.to === 'WON') {
            const parsed = parseShekels(ask.value)
            if (!parsed.ok) return setError(parsed.error)
            commit(ask.leadId, 'WON', parsed.value ? { quotedPrice: parsed.value } : {})
          } else {
            const text = reason === 'Other' ? detail.trim() || 'Other' : detail.trim() ? `${reason}: ${detail.trim()}` : reason
            commit(ask.leadId, 'LOST', { lostReason: text })
          }
          close()
        }}
      >
        {ask?.to === 'WON' ? (
          <div className="space-y-2">
            <Label htmlFor="deal-value">Quoted price (₪)</Label>
            <Input id="deal-value" inputMode="numeric" autoFocus placeholder="e.g. 17000" value={ask.value} onChange={(e) => setAsk({ ...ask, value: e.target.value })} />
            {dealTerms && priceNow ? (
              <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300" aria-live="polite">
                {dealTerms.salesperson ?? 'Commission'}: <strong>{formatIls(calculateCommission(priceNow, dealTerms.terms).total)}</strong>
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="lost-reason">Reason</Label>
              <Select id="lost-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
                {LOST_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lost-detail">Details {reason === 'Other' ? '' : '(optional)'}</Label>
              <Textarea id="lost-detail" rows={2} maxLength={400} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Anything worth remembering for next time" />
            </div>
          </>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant={ask?.to === 'LOST' ? 'destructive' : 'default'}>
            {ask?.to === 'WON' ? 'Mark as won' : 'Mark as lost'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
  return { request, pending, error, dialog }
}

/** Stage dropdown used in tables and on the contact page. */
export function StageSelect({ leadId, status, quotedPrice, disabled, title, className, onDone, isAdmin }: { leadId: string; status: LeadStatus; quotedPrice?: number | null; isAdmin: boolean; disabled?: boolean; title?: string; className?: string; onDone?: (res: { ok: boolean; error?: string }) => void }): React.ReactElement {
  const { request, pending, error, dialog } = useStageChange(onDone)
  const role = isAdmin ? 'ADMIN' : 'SALES'
  // Non-admins can only pick up to Demo scheduled, and a lead already past it is locked for them.
  const locked = !canEditAtStage(role, status)
  const options = stagesFor(role, LEAD_STATUSES)
  return (
    <span className="inline-flex flex-col gap-1">
      <Select
        aria-label="Stage"
        title={locked ? 'An admin set this stage, so only an admin can change it' : title}
        className={cn('h-8 w-40', className)}
        disabled={pending || disabled || locked}
        value={status}
        onChange={(e) => request(leadId, e.target.value as LeadStatus, quotedPrice)}
      >
        {(options.includes(status) ? options : [...options, status]).map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </Select>
      {error && !onDone ? <span className="max-w-[16rem] text-xs text-red-400">{error}</span> : null}
      {dialog}
    </span>
  )
}
