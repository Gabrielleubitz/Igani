'use client'

import { Loader2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MAX_PAST_CALL_BYTES, pastCallFileError } from '@/lib/past-call'

/** Admin only: add a past call (a training call, say) from an audio file and review it like a live one. The audio is not saved. */
export function UploadPastCall({ people }: { people: { id: string; name: string }[] }): React.ReactElement {
  const router = useRouter()
  const [personId, setPersonId] = useState('')
  const [date, setDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async (): Promise<void> => {
    if (!file || !personId) return
    const problem = pastCallFileError(file)
    if (problem) return setError(problem)
    setBusy(true)
    setError(null)
    try {
      const body = new FormData()
      body.set('personId', personId)
      body.set('date', date)
      body.set('file', file)
      const res = await fetch('/api/calls/upload', { method: 'POST', body })
      const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string }
      if (json.id) router.push(`/sales/calls/${json.id}`)
      if (!res.ok || json.error) setError(json.error ?? 'Could not add the call.')
    } catch {
      setError('Could not add the call. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <details className="rounded-2xl border bg-card/60">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <Upload className="h-4 w-4" aria-hidden /> Add a past call
      </summary>
      <div className="space-y-3 border-t px-4 py-3 text-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Salesperson</span>
            <select className="h-9 rounded-md border bg-background px-2" value={personId} onChange={(e) => setPersonId(e.target.value)}>
              <option value="">Choose…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Call date (optional)</span>
            <Input type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Audio file (up to {MAX_PAST_CALL_BYTES / 1024 / 1024} MB)</span>
            <Input type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <Button size="sm" disabled={busy || !file || !personId} onClick={() => void send()}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden /> : null}
            {busy ? 'Reviewing…' : 'Add and review'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">It is added to that person’s calls and reviewed like a call just ended, even if it is under 60 seconds. Only the transcript and the review are saved, not the audio, so it can’t be played back.</p>
        {error ? <p className="text-red-400">{error}</p> : null}
      </div>
    </details>
  )
}
