'use client'

import type { LeadStatus } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { assignLead, autoAssignLead } from '@/app/actions/leads'
import { StageSelect } from '@/components/crm/StageSelect'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input, Select } from '@/components/ui/input'
import { parseShekels } from '@/lib/money'

interface Props {
  leadId: string
  status: LeadStatus
  quotedPrice?: number | null
  assignedToId: string | null
  currentUserId: string
  isAdmin: boolean
  canClaim?: boolean
  /** Admin-only: a won deal's commission, which has to be dealt with when the lead changes hands */
  wonCommission?: number | null
  commissionPaidOut?: boolean
  reps: { id: string; label: string }[]
}

/** Stage + owner controls for one contact (pipeline rows and the contact page). */
export function LeadControls({ leadId, status, quotedPrice, assignedToId, currentUserId, isAdmin, canClaim = true, reps, wonCommission = null, commissionPaidOut = false }: Props): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>): void =>
    start(async () => {
      const res = await fn()
      setError(res.ok ? null : (res.error ?? 'Failed'))
      router.refresh()
    })
  const canMove = isAdmin || assignedToId === currentUserId
  // Reassigning a won deal: the admin decides what happens to its commission.
  const [pendingOwner, setPendingOwner] = useState<{ to: string | null } | null>(null)
  const [choice, setChoice] = useState<'keep' | 'recalculate' | 'custom'>('keep')
  const [custom, setCustom] = useState('')

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StageSelect
        leadId={leadId}
        status={status}
        quotedPrice={quotedPrice}
        isAdmin={isAdmin}
        disabled={!canMove}
        title={canMove ? 'Change stage' : assignedToId ? 'Only the owner can change the stage' : 'Claim this contact to change its stage'}
        onDone={(res) => setError(res.ok ? null : (res.error ?? 'Failed'))}
      />
      {isAdmin ? (
        <>
          <Select
            aria-label="Owner"
            className="h-8 w-44"
            disabled={pending}
            value={assignedToId ?? ''}
            onChange={(e) => {
              const to = e.target.value || null
              if (wonCommission !== null && to !== assignedToId) {
                if (commissionPaidOut) return setError('This deal’s commission was already paid out to the current rep. Undo the payout first.')
                setChoice('keep')
                setCustom(String(wonCommission))
                return setPendingOwner({ to })
              }
              run(() => assignLead(leadId, to))
            }}
          >
            <option value="">Unassigned</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
          {!assignedToId ? (
            <Button size="sm" variant="outline" className="h-8" title="Give this contact to the next sales rep in turn" disabled={pending} onClick={() => run(() => autoAssignLead(leadId))}>
              Auto-assign
            </Button>
          ) : null}
        </>
      ) : !assignedToId && canClaim ? (
        <Button size="sm" variant="outline" className="h-8" disabled={pending} onClick={() => run(() => assignLead(leadId, currentUserId))}>
          Claim
        </Button>
      ) : null}
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
      <Dialog open={pendingOwner !== null} onClose={() => setPendingOwner(null)} title="Reassign a won deal" description={`This deal has a commission${wonCommission !== null ? ` of ₪${wonCommission.toLocaleString('en-US')}` : ''}. Choose what happens to it.`}>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (!pendingOwner) return
            const parsed = parseShekels(custom)
            if (choice === 'custom' && (!parsed.ok || parsed.value === null)) return setError(parsed.ok ? 'Enter the commission amount in whole shekels.' : parsed.error)
            const amount = parsed.ok ? (parsed.value ?? 0) : 0
            const to = pendingOwner.to
            setPendingOwner(null)
            run(() => assignLead(leadId, to, choice === 'custom' ? { mode: 'custom', amount } : { mode: choice }))
          }}
        >
          {(
            [
              ['keep', 'Keep the commission as it is', 'The new owner is credited with the same amount.'],
              ['recalculate', 'Recalculate with the new owner’s terms', 'Uses their agreed terms (and any changes made for this deal).'],
              ['custom', 'Set a custom amount', 'You decide the commission for this deal.'],
            ] as const
          ).map(([k, label, hint]) => (
            <label key={k} className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm">
              <input type="radio" name="commission-choice" className="mt-1" checked={choice === k} onChange={() => setChoice(k)} />
              <span>
                <span className="font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
                {k === 'custom' && choice === 'custom' ? <Input className="mt-2 h-8 w-40" inputMode="numeric" aria-label="Commission amount in shekels" value={custom} onChange={(ev) => setCustom(ev.target.value)} /> : null}
              </span>
            </label>
          ))}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setPendingOwner(null)}>
              Cancel
            </Button>
            <Button type="submit">Reassign</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
