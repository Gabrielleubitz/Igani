'use client'

import type { LeadStatus } from '@prisma/client'
import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable, type ColumnDef, type SortingState, type VisibilityState } from '@tanstack/react-table'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { archiveLeads, bulkUpdateLeads, deleteLeads, exportLeadsCsv, updateLead, updateLeadStatus } from '@/app/actions/leads'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
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
  tags: string[]
  createdAt: string
  dealValue: number | null
  lostReason: string | null
}

interface Props {
  rows: LeadRow[]
  reps: { id: string; label: string }[]
  archivedView: boolean
  query: Record<string, string | undefined>
  isAdmin: boolean
}

export function LeadsTable({ rows, reps, archivedView, query, isAdmin }: Props): React.ReactElement {
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

  const addTag = (l: LeadRow): void => {
    const tag = window.prompt('Add a tag')?.trim().toLowerCase()
    if (tag) run(() => updateLead(l.id, { tags: [...l.tags, tag] }), 'Tag added.')
  }
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [visibility, setVisibility] = useState<VisibilityState>({})
  const columns = useMemo<ColumnDef<LeadRow>[]>(
    () => [
      { id: 'select', header: '', enableHiding: false, enableSorting: false, cell: ({ row }) => <input type="checkbox" aria-label={`Select ${row.original.email}`} checked={sel.has(row.original.id)} onChange={() => toggle(row.original.id)} /> },
      { accessorKey: 'name', header: 'Name', enableHiding: false, cell: ({ row }) => <Link href={`/sales/leads/${row.original.id}`} className="font-medium underline-offset-4 hover:underline">{row.original.name}</Link> },
      { accessorKey: 'email', header: 'Email' },
      { accessorKey: 'company', header: 'Company' },
      { id: 'tags', header: 'Tags', accessorFn: (l) => l.tags.join(' '), cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1">
          {row.original.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => addTag(row.original)}>+ tag</button>
        </div>
      ) },
      { accessorKey: 'status', header: 'Stage', cell: ({ row }) => (
        <Select aria-label="Stage" className="h-8 w-40" disabled={pending} value={row.original.status} onChange={(e) => changeStatus(row.original.id, e.target.value as LeadStatus)}>
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </Select>
      ) },
      { accessorKey: 'owner', header: 'Owner', cell: ({ row }) => row.original.owner ?? <Badge variant="secondary">unassigned</Badge> },
      { accessorKey: 'source', header: 'Source' },
      { accessorKey: 'dealValue', header: 'Value', cell: ({ row }) => row.original.dealValue ?? '' },
      { accessorKey: 'createdAt', header: 'Created', cell: ({ row }) => row.original.createdAt.slice(0, 10) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sel, pending],
  )
  const table = useReactTable({
    data: rows,
    columns,
    state: { globalFilter: search, sorting, columnVisibility: visibility },
    onGlobalFilterChange: setSearch,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
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
        {isAdmin ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending || !sel.size}
            onClick={() => window.confirm(`Permanently delete ${sel.size} lead(s)? This cannot be undone.`) && run(() => deleteLeads(ids), 'Deleted.')}
          >
            Delete
          </Button>
        ) : null}
        <Button size="sm" variant="outline" disabled={pending} onClick={download}>
          Export CSV
        </Button>
        {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Input aria-label="Instant search" placeholder="Instant search this page…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-64" />
        <details className="relative text-sm">
          <summary className="cursor-pointer rounded-md border px-3 py-1.5">Columns</summary>
          <div className="absolute z-10 mt-1 space-y-1 rounded-md border bg-card p-3 shadow">
            {table.getAllLeafColumns().filter((c) => c.getCanHide()).map((c) => (
              <label key={c.id} className="flex items-center gap-2">
                <input type="checkbox" checked={c.getIsVisible()} onChange={c.getToggleVisibilityHandler()} /> {String(c.columnDef.header)}
              </label>
            ))}
          </div>
        </details>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="border-b text-xs uppercase text-muted-foreground">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="p-3 font-medium">
                    {h.column.getCanSort() ? (
                      <button type="button" onClick={h.column.getToggleSortingHandler()}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {{ asc: ' ↑', desc: ' ↓' }[h.column.getIsSorted() as string] ?? ''}
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y">
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id}>
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="p-3">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {table.getRowModel().rows.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No leads match.</p> : null}
      </div>
    </div>
  )
}
