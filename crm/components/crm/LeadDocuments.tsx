'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { deleteLeadDocument } from '@/app/actions/lead-documents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AGREEMENT_TYPES, MAX_AGREEMENT_BYTES, agreementUploadProblem, formatSize } from '@/lib/agreements'

export interface LeadDocumentRow {
  id: string
  title: string
  fileName: string
  size: number
  createdAt: string
  by: string
  canDelete: boolean
}

/** Documents for one client (contract, brief, screenshots…). Everyone who can see the lead can add and download. */
export function LeadDocuments({ leadId, documents }: { leadId: string; documents: LeadDocumentRow[] }): React.ReactElement {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [pending, start] = useTransition()

  async function upload(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return setMsg({ ok: false, text: 'Choose a file first.' })
    const problem = agreementUploadProblem({ name: file.name, type: file.type, size: file.size })
    if (problem) return setMsg({ ok: false, text: problem })
    setBusy(true)
    setMsg(null)
    try {
      const body = new FormData()
      body.set('title', title)
      body.set('file', file)
      const res = await fetch(`/api/leads/${leadId}/documents`, { method: 'POST', body })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (res.ok) {
        setMsg({ ok: true, text: '✓ Added.' })
        setTitle('')
        if (fileRef.current) fileRef.current.value = ''
        router.refresh()
      } else setMsg({ ok: false, text: json.error ?? 'Upload failed.' })
    } catch {
      setMsg({ ok: false, text: 'Upload failed. Check your connection and try again.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {documents.length === 0 ? <p className="text-sm text-muted-foreground">No documents for this client yet.</p> : null}
      <div className="divide-y">
        {documents.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-2 py-2 text-sm">
            <div className="min-w-0">
              <a href={`/api/lead-documents/${d.id}`} className="block truncate font-medium text-primary underline-offset-4 hover:underline">
                {d.title}
              </a>
              <div className="truncate text-xs text-muted-foreground">
                {d.fileName} · {formatSize(d.size)} · {d.by} · {new Date(d.createdAt).toLocaleDateString('en-GB')}
              </div>
            </div>
            {d.canDelete ? (
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 text-red-400 hover:text-red-300"
                disabled={pending}
                onClick={() =>
                  window.confirm(`Remove “${d.title}”?`) &&
                  start(async () => {
                    const res = await deleteLeadDocument(d.id)
                    setMsg(res.ok ? { ok: true, text: 'Removed.' } : { ok: false, text: res.error })
                    router.refresh()
                  })
                }
              >
                Delete
              </Button>
            ) : null}
          </div>
        ))}
      </div>
      <form onSubmit={upload} className="space-y-2 border-t pt-3">
        <Input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} aria-label="Document title" />
        <Input ref={fileRef} type="file" accept={Object.keys(AGREEMENT_TYPES).join(',')} aria-label="Document file" />
        <p className="text-xs text-muted-foreground">PDF, Word, image or text, up to {MAX_AGREEMENT_BYTES / 1024 / 1024} MB.</p>
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? 'Uploading…' : 'Add document'}
          </Button>
          {msg ? <span className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</span> : null}
        </div>
      </form>
    </div>
  )
}
