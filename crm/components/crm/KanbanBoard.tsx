'use client'

import type { LeadStatus } from '@prisma/client'
import Link from 'next/link'
import { useState } from 'react'
import { useStageChange } from '@/components/crm/StageSelect'
import { LEAD_STATUSES, STATUS_LABEL, formatMoney } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface BoardLead {
  id: string
  name: string
  company: string | null
  email: string | null
  owner: string | null
  budget: string | null
  dealValue: number | null
  score: number
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

/**
 * Drag a card between columns to change stage (desktop), or use the small stage menu on each card (touch/keyboard).
 * Won/Lost open the same dialog as everywhere else, so a Lost reason is always captured.
 */
export function KanbanBoard({ leads }: { leads: (BoardLead & { status: LeadStatus })[] }): React.ReactElement {
  const { request, pending, error, dialog } = useStageChange()
  const [over, setOver] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)

  return (
    <div>
      {error ? <p className="mb-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
      <div className={cn('flex snap-x gap-3 overflow-x-auto pb-3 xl:grid xl:grid-cols-6 xl:overflow-visible', pending && 'opacity-70')}>
        {LEAD_STATUSES.map((status) => {
          const col = leads.filter((l) => l.status === status)
          const value = col.reduce((n, l) => n + (l.dealValue ?? 0), 0)
          return (
            <section
              key={status}
              aria-label={STATUS_LABEL[status]}
              onDragOver={(e) => {
                e.preventDefault()
                setOver(status)
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(e) => {
                e.preventDefault()
                setOver(null)
                setDragging(null)
                const id = e.dataTransfer.getData('text/plain')
                const lead = leads.find((l) => l.id === id)
                if (lead && lead.status !== status && lead.canMove) request(id, status, lead.dealValue)
              }}
              className={cn('min-h-[240px] w-64 shrink-0 snap-start rounded-lg border border-t-4 bg-card/40 p-2 xl:w-auto', COLORS[status], over === status && 'ring-2 ring-ring')}
            >
              <h2 className="mb-2 flex items-baseline justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{STATUS_LABEL[status]}</span>
                <span className="tabular-nums">{col.length}</span>
              </h2>
              {value ? <div className="-mt-1 mb-2 px-1 text-xs tabular-nums text-muted-foreground">{formatMoney(value)} value</div> : null}
              <div className="space-y-2">
                {col.length === 0 ? <p className="px-1 py-6 text-center text-xs text-muted-foreground/70">Drop here</p> : null}
                {col.map((l) => (
                  <article
                    key={l.id}
                    draggable={l.canMove}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', l.id)
                      setDragging(l.id)
                    }}
                    onDragEnd={() => setDragging(null)}
                    className={cn('rounded-md border bg-background p-2.5 text-sm shadow-sm transition-shadow hover:shadow-md', l.canMove && 'cursor-grab active:cursor-grabbing', dragging === l.id && 'opacity-50')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/sales/leads/${l.id}`} className="min-w-0 truncate font-medium hover:underline">
                        {l.name}
                      </Link>
                      {status !== 'WON' && status !== 'LOST' ? (
                        <span title="Heat score" className={cn('shrink-0 rounded px-1 text-[10px] font-semibold tabular-nums', l.score >= 65 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}>
                          {l.score}
                        </span>
                      ) : null}
                    </div>
                    {l.company ? <div className="truncate text-xs text-muted-foreground">{l.company}</div> : null}
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{l.owner ?? 'Unassigned'}</span>
                      {l.dealValue ? <span className="tabular-nums">{formatMoney(l.dealValue)}</span> : l.budget ? <span className="truncate">{l.budget}</span> : null}
                    </div>
                    {l.canMove ? (
                      <select
                        aria-label={`Move ${l.name} to stage`}
                        value={status}
                        disabled={pending}
                        onChange={(e) => request(l.id, e.target.value as LeadStatus, l.dealValue)}
                        className="mt-2 w-full rounded border bg-transparent px-1 py-0.5 text-xs text-muted-foreground xl:hidden"
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            Move to: {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          )
        })}
      </div>
      {dialog}
    </div>
  )
}
