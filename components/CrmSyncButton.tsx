'use client'

import { useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'

type Totals = { created: number; alreadyInCrm: number; skipped: number; failed: number }

/**
 * "Send to CRM" panel for the site admin. Copies existing site leads / contact submissions into the Igani CRM
 * in batches (safe to repeat: the CRM de-duplicates). New submissions are forwarded automatically.
 * Asks for the server-side admin password once per browser session (it is never built into the page).
 */
export function CrmSyncButton({ collection, label }: { collection: 'all' | 'leads' | 'contact'; label: string }) {
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<Totals | null>(null)
  const [error, setError] = useState<string | null>(null)
  const crmUrl = process.env.NEXT_PUBLIC_CRM_URL || 'https://app.igani.co'

  const run = async () => {
    if (!window.confirm(`Copy ${label.toLowerCase()} into the Igani CRM? People already in the CRM are matched, not duplicated.`)) return
    let password = ''
    try {
      password = sessionStorage.getItem('crmSyncPassword') ?? ''
    } catch {}
    if (!password) password = window.prompt('Admin password for CRM sync (the server-side ADMIN_PASSWORD):') ?? ''
    if (!password) return
    setBusy(true)
    setError(null)
    setResult(null)
    const totals: Totals = { created: 0, alreadyInCrm: 0, skipped: 0, failed: 0 }
    try {
      let cursor: number | null = 0
      while (cursor !== null) {
        const res: Response = await fetch(`/api/admin/crm-sync?collection=${collection}&cursor=${cursor}`, { method: 'POST', headers: { 'x-admin-password': password } })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          if (res.status === 401) {
            try {
              sessionStorage.removeItem('crmSyncPassword')
            } catch {}
          }
          throw new Error(data.error || `Failed (${res.status})`)
        }
        try {
          sessionStorage.setItem('crmSyncPassword', password)
        } catch {}
        for (const k of Object.keys(totals) as (keyof Totals)[]) totals[k] += data[k] ?? 0
        setProgress({ done: data.processed, total: data.total })
        setResult({ ...totals })
        cursor = data.next
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3">
      <div className="text-sm text-slate-300">
        <span className="font-semibold text-white">Igani CRM</span> · new submissions are sent automatically, with where they came from.
        {busy && progress ? <span className="mt-1 block text-slate-200">Sending… {progress.done} of {progress.total}</span> : null}
        {result && !busy ? (
          <span className="mt-1 block text-emerald-300">
            Done: {result.created} added, {result.alreadyInCrm} already in the CRM{result.skipped ? `, ${result.skipped} skipped (no valid email or phone)` : ''}
            {result.failed ? `, ${result.failed} failed (run it again to retry)` : ''}.
          </span>
        ) : null}
        {error ? <span className="mt-1 block text-red-300">{error}</span> : null}
      </div>
      <div className="flex items-center gap-2">
        <a href={`${crmUrl}/sales/leads`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/50">
          Open CRM <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <button type="button" onClick={run} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> {busy ? 'Sending…' : `Send ${label.toLowerCase()} to CRM`}
        </button>
      </div>
    </div>
  )
}
