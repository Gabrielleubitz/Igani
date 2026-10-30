'use client'

import type { LeadStatus } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { archiveLeads, bulkUpdateLeads, deleteLeads, exportLeadsCsv, updateLeadStatus } from '@/app/actions/leads'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { LEAD_STATUSES } from '@/lib/format'

export interface LeadRow {
  id: string
  name: string
  email: string
  company: string | null
  status: LeadStatus
  source: string
  owner: string | null
  assignedToId: string | null
  createdAt: string
  dealValue: number | null
  lostReason: string | null
}

interface Props {
  rows: LeadRow[]
  reps: { id: string; label: string }[]
  archivedView: boolean
  query: Record<string, string | undefined>
}

export function LeadsTable({ rows, reps, archivedView, query }: Props): React.ReactElement {
  const router = useRouter()
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const ids = [...sel]
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok = 'Done.'): void =>
    start(async () => {
      const res = await fn()
      setMsg(res.ok ? ok : (res.error ?? 'Failed'))
      if (res.ok) setSel(new Set())
      router.refresh()
    })
  const toggle = (id: string): void =>
    setSel((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const changeStatus = (id: string, status: LeadStatus): void => {
    let extras: { lostReason?: string; dealValue?: number } = {}
    if (status === 'LOST') {
      const reason = window.prompt('Why was this lead lost?')
      if (!reason?.trim()) return
      extras = { lostReason: reason }
    } else if (status === 'WON') {
      const v = window.prompt('Deal value (optional, whole number)')
      if (v && /^\d+$/.test(v.trim())) extras = { dealValue: Number(v) }
    }
    run(() => updateLeadStatus(id, status, extras), 'Status updated.')
  }
  const download = (): void =>
    start(async () => {
      const res = await exportLeadsCsv(query)
      if (!res.ok) return setMsg(res.error)
      const url = URL.createObjectURL(new Blob([res.data.csv], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `igani-leads-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">{sel.size} selected</span>
        <Select aria-label="Bulk assign" className="h-8 w-44" disabled={pending || !sel.size} value="" onChange={(e) => e.target.value && run(() => bulkUpdateLeads(ids, { assigneeId: e.target.value === 'none' ? null : e.target.value }), 'Assigned.')}>
          <option value="">Assign to…</option>
          <option value="none">Unassigned</option>
          {reps.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </Select>
        <Select aria-label="Bulk status" className="h-8 w-44" disabled={pending || !sel.size} value="" onChange={(e) => e.target.value && run(() => bulkUpdateLeads(ids, { status: e.target.value as LeadStatus }), 'Status updated.')}>
          <option value="">Move to…</option>
          {LEAD_STATUSES.filter((s) => s !== 'LOST').map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </Select>
        <Button size="sm" variant="outline" disabled={pending || !sel.size} onClick={() => run(() => archiveLeads(ids, !archivedView), archivedView ? 'Restored.' : 'Archived.')}>
          {archivedView ? 'Restore' : 'Archive'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || !sel.size}
          onClick={() => window.confirm(`Permanently delete ${sel.size} lead(s)? This cannot be undone.`) && run(() => deleteLeads(ids), 'Deleted.')}
        >
          Delete
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={download}>
          Export CSV
        </Button>
        {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
      </div>
      <div className="divide-y rounded-lg border">
        {rows.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No leads match.</p> : null}
        {rows.map((l) => (
          <div key={l.id} className="flex flex-wrap items-center gap-3 p-3">
            <input type="checkbox" aria-label={`Select ${l.email}`} checked={sel.has(l.id)} onChange={() => toggle(l.id)} />
            <div className="min-w-0 flex-1">
              <div className="font-medium">
                {l.name} {l.company ? <span className="text-muted-foreground">· {l.company}</span> : null}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {l.email} · {l.source} · {l.createdAt.slice(0, 10)} · {l.owner ?? 'unassigned'}
                {l.dealValue != null ? ` · value ${l.dealValue}` : ''}
                {l.lostReason ? ` · lost: ${l.lostReason}` : ''}
              </div>
            </div>
            {l.assignedToId === null ? <Badge variant="secondary">unassigned</Badge> : null}
            <Select aria-label="Stage" className="h-8 w-44" disabled={pending} value={l.status} onChange={(e) => changeStatus(l.id, e.target.value as LeadStatus)}>
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </div>
        ))}
      </div>
    </div>
  )
}
