'use client'

import type { LeadStatus } from '@prisma/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { updateLeadStatus } from '@/app/actions/leads'
import { LEAD_STATUSES } from '@/lib/format'

export interface BoardLead {
  id: string
  name: string
  company: string | null
  email: string
  owner: string | null
  budget: string | null
  canMove: boolean
}

const COLORS: Record<string, string> = {
  NEW: 'border-t-sky-400',
  CONTACTED: 'border-t-indigo-400',
  DEMO_SCHEDULED: 'border-t-violet-400',
  PROPOSAL_SENT: 'border-t-amber-400',
  WON: 'border-t-emerald-400',
  LOST: 'border-t-rose-400',
}

/** Drag a card between columns to change status (reuses the audited updateLeadStatus action). */
export function KanbanBoard({ leads }: { leads: (BoardLead & { status: LeadStatus })[] }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const items = leads

  const move = (id: string, status: LeadStatus): void =>
    start(async () => {
      const res = await updateLeadStatus(id, status)
      setError(res.ok ? null : res.error)
      router.refresh()
    })

  return (
    <div>
      {error ? <p className="mb-2 text-sm text-red-400">{error}</p> : null}
      <div className={`grid gap-3 overflow-x-auto md:grid-cols-3 xl:grid-cols-6 ${pending ? 'opacity-70' : ''}`}>
        {LEAD_STATUSES.map((status) => {
          const col = items.filter((l) => l.status === status)
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(status)
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault()
                setOver(null)
                const id = e.dataTransfer.getData('text/plain')
                const lead = items.find((l) => l.id === id)
                if (lead && lead.status !== status && lead.canMove) move(id, status)
              }}
              className={`min-h-[200px] rounded-lg border border-t-4 bg-card/40 p-2 ${COLORS[status]} ${over === status ? 'ring-2 ring-ring' : ''}`}
            >
              <h2 className="mb-2 flex justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{status.replace('_', ' ')}</span>
                <span>{col.length}</span>
              </h2>
              <div className="space-y-2">
                {col.map((l) => (
                  <div
                    key={l.id}
                    draggable={l.canMove}
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', l.id)}
                    className={`rounded-md border bg-background p-2 text-sm shadow-sm ${l.canMove ? 'cursor-grab' : ''}`}
                  >
                    <Link href={`/sales/leads/${l.id}`} className="font-medium hover:underline">
                      {l.name}
                    </Link>
                    {l.company ? <div className="text-xs text-muted-foreground">{l.company}</div> : null}
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>{l.owner ?? 'unassigned'}</span>
                      {l.budget ? <span>{l.budget}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
