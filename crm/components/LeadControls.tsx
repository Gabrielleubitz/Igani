'use client'

import type { LeadStatus } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { assignLead, autoAssignLead } from '@/app/actions/leads'
import { StageSelect } from '@/components/crm/StageSelect'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'

interface Props {
  leadId: string
  status: LeadStatus
  dealValue?: number | null
  assignedToId: string | null
  currentUserId: string
  isAdmin: boolean
  canClaim?: boolean
  reps: { id: string; label: string }[]
}

/** Stage + owner controls for one contact (pipeline rows and the contact page). */
export function LeadControls({ leadId, status, dealValue, assignedToId, currentUserId, isAdmin, canClaim = true, reps }: Props): React.ReactElement {
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

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StageSelect
        leadId={leadId}
        status={status}
        dealValue={dealValue}
        disabled={!canMove}
        title={canMove ? 'Change stage' : assignedToId ? 'Only the owner can change the stage' : 'Claim this contact to change its stage'}
        onDone={(res) => setError(res.ok ? null : (res.error ?? 'Failed'))}
      />
      {isAdmin ? (
        <>
          <Select aria-label="Owner" className="h-8 w-44" disabled={pending} value={assignedToId ?? ''} onChange={(e) => run(() => assignLead(leadId, e.target.value || null))}>
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
    </div>
  )
}
