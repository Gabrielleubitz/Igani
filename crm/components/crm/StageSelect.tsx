'use client'

import type { LeadStatus } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { updateLeadStatus } from '@/app/actions/leads'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input, Label, Select, Textarea } from '@/components/ui/input'
import { LEAD_STATUSES, STATUS_LABEL } from '@/lib/format'
import { cn } from '@/lib/utils'

export const LOST_REASONS = ['Budget', 'Chose a competitor', 'No response', 'Timing / not now', 'Not a fit', 'Other'] as const

type Extras = { lostReason?: string; dealValue?: number }

/**
 * Hook behind every stage change in the CRM. Moving to Lost asks for a reason (required),
 * moving to Won asks for the deal value (optional) — in a proper dialog instead of a browser prompt.
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
    } else commit(leadId, to)
  }

  const close = (): void => setAsk(null)
  const dialog = (
    <Dialog
      open={ask !== null}
      onClose={close}
      title={ask?.to === 'WON' ? 'Mark as won 🎉' : 'Mark as lost'}
      description={ask?.to === 'WON' ? 'Nice work. Add the deal value so revenue reports stay accurate (optional).' : 'Pick a reason. It is saved on the contact and shows up in Reports.'}
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ask) return
          if (ask.to === 'WON') {
            const v = ask.value.replace(/[^\d]/g, '')
            commit(ask.leadId, 'WON', v ? { dealValue: Number(v) } : {})
          } else {
            const text = reason === 'Other' ? detail.trim() || 'Other' : detail.trim() ? `${reason}: ${detail.trim()}` : reason
            commit(ask.leadId, 'LOST', { lostReason: text })
          }
          close()
        }}
      >
        {ask?.to === 'WON' ? (
          <div className="space-y-2">
            <Label htmlFor="deal-value">Deal value</Label>
            <Input id="deal-value" inputMode="numeric" autoFocus placeholder="e.g. 12000" value={ask.value} onChange={(e) => setAsk({ ...ask, value: e.target.value })} />
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
export function StageSelect({ leadId, status, dealValue, disabled, title, className, onDone }: { leadId: string; status: LeadStatus; dealValue?: number | null; disabled?: boolean; title?: string; className?: string; onDone?: (res: { ok: boolean; error?: string }) => void }): React.ReactElement {
  const { request, pending, error, dialog } = useStageChange(onDone)
  return (
    <span className="inline-flex flex-col gap-1">
      <Select
        aria-label="Stage"
        title={title}
        className={cn('h-8 w-40', className)}
        disabled={pending || disabled}
        value={status}
        onChange={(e) => request(leadId, e.target.value as LeadStatus, dealValue)}
      >
        {LEAD_STATUSES.map((s) => (
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
