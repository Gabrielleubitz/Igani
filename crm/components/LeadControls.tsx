'use client'

import type { LeadStatus } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { assignLead, autoAssignLead, updateLeadStatus } from '@/app/actions/leads'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { LEAD_STATUSES } from '@/lib/format'


interface Props {
  leadId: string
  status: LeadStatus
  assignedToId: string | null
  currentUserId: string
  isAdmin: boolean
  reps: { id: string; label: string }[]
}

export function LeadControls({ leadId, status, assignedToId, currentUserId, isAdmin, reps }: Props): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>): void =>
    start(async () => {
      const res = await fn()
      setError(res.ok ? null : (res.error ?? 'Failed'))
      router.refresh()
    })
  const canEdit = isAdmin || assignedToId === currentUserId

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        aria-label="Stage"
        className="h-8 w-44"
        disabled={pending || !canEdit}
        value={status}
        onChange={(e) => run(() => updateLeadStatus(leadId, e.target.value as LeadStatus))}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace('_', ' ')}
          </option>
        ))}
      </Select>
      {isAdmin ? (
        <>
          <Select
            aria-label="Assignee"
            className="h-8 w-44"
            disabled={pending}
            value={assignedToId ?? ''}
            onChange={(e) => run(() => assignLead(leadId, e.target.value || null))}
          >
            <option value="">Unassigned</option>
            {reps.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </Select>
          {!assignedToId ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => autoAssignLead(leadId))}>
              Round-robin
            </Button>
          ) : null}
        </>
      ) : !assignedToId ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => assignLead(leadId, currentUserId))}>
          Claim
        </Button>
      ) : null}
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  )
}
