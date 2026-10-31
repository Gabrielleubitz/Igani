'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { commitLeadImport, previewLeadImport, type ImportPreview } from '@/app/sales/import/actions'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { csvToLeadRows, parseCsv, type ImportRow } from './crm-utils'

export function LeadImport(): React.ReactElement {
  const [pending, start] = useTransition()
  const [rows, setRows] = useState<ImportRow[]>([])
  const [fileErrors, setFileErrors] = useState<{ line: number; reason: string }[]>([])
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [mode, setMode] = useState<'skip' | 'merge'>('skip')
  const [msg, setMsg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onFile = async (file: File | undefined): Promise<void> => {
    setPreview(null)
    setMsg(null)
    setError(null)
    if (!file) return
    const { leads, errors } = csvToLeadRows(parseCsv(await file.text()))
    setRows(leads)
    setFileErrors(errors)
    if (leads.length === 0) return
    start(async () => {
      const res = await previewLeadImport(leads)
      if (res.ok) setPreview(res.data)
      else setError(res.error)
    })
  }

  const commit = (): void =>
    start(async () => {
      const res = await commitLeadImport(rows, mode)
      if (res.ok) {
        setMsg(`Imported: ${res.data.created} new, ${res.data.merged} merged, ${res.data.skipped} skipped.`)
        setPreview(null)
        setRows([])
      } else setError(res.error)
    })

  return (
    <div className="space-y-4">
      <Input type="file" aria-label="CSV file" accept=".csv,text/csv" onChange={(e) => void onFile(e.target.files?.[0])} className="h-auto max-w-sm cursor-pointer py-2 file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-sm file:text-primary-foreground" />
      {pending ? <p className="text-sm text-muted-foreground">Working…</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {msg ? (
        <p className="text-sm text-emerald-400">
          {msg}{' '}
          <Link href="/sales/leads?source=csv-import" className="font-medium underline underline-offset-4">
            View imported contacts →
          </Link>
        </p>
      ) : null}

      {fileErrors.length > 0 ? (
        <div className="rounded-md border p-3 text-sm">
          <div className="mb-1 font-medium">{fileErrors.length} row(s) will be ignored</div>
          <ul className="max-h-32 overflow-auto text-xs text-muted-foreground">
            {fileErrors.slice(0, 50).map((e) => (
              <li key={e.line}>
                Line {e.line}: {e.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview ? (
        <div className="space-y-3 rounded-md border p-3 text-sm">
          <div>
            <strong>{preview.fresh}</strong> new · <strong>{preview.duplicates.length}</strong> already in the CRM (matched by email) ·{' '}
            <strong>{preview.invalid.length}</strong> invalid
          </div>
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Company</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 10).map((r) => (
                <tr key={r.email} className="border-t">
                  <td className="py-1">{r.email}</td>
                  <td>{[r.firstName, r.lastName].filter(Boolean).join(' ')}</td>
                  <td>{r.company}</td>
                  <td>{preview.duplicates.includes(r.email) ? 'duplicate' : 'new'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 10 ? <p className="text-xs text-muted-foreground">…and {rows.length - 10} more</p> : null}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={mode} onChange={(e) => setMode(e.target.value as 'skip' | 'merge')} className="h-9 w-72">
              <option value="skip">Duplicates: skip</option>
              <option value="merge">Duplicates: merge (fill blanks, append message)</option>
            </Select>
            <Button onClick={commit} disabled={pending || preview.fresh + (mode === 'merge' ? preview.duplicates.length : 0) === 0}>
              {pending ? 'Importing…' : `Import ${preview.fresh + (mode === 'merge' ? preview.duplicates.length : 0)} contact${preview.fresh + (mode === 'merge' ? preview.duplicates.length : 0) === 1 ? '' : 's'}`}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
