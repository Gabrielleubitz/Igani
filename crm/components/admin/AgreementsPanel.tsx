'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { deleteAgreement } from '@/app/actions/deals'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { AGREEMENT_TYPES, MAX_AGREEMENT_BYTES, agreementUploadProblem, formatSize } from '@/lib/agreements'

export interface AgreementRow {
  id: string
  title: string
  fileName: string
  size: number
  createdAt: string
}

/** Admin: upload the agreements we have with a salesperson, download or remove them. */
export function AgreementsPanel({ userId, name, agreements }: { userId: string; name: string; agreements: AgreementRow[] }): React.ReactElement {
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
      body.set('userId', userId)
      body.set('title', title)
      body.set('file', file)
      const res = await fetch('/api/admin/agreements', { method: 'POST', body })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (res.ok) {
        setMsg({ ok: true, text: `✓ Uploaded. ${name} can now see it under Documents.` })
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
    <div className="space-y-4">
      {agreements.length === 0 ? <p className="text-sm text-muted-foreground">No agreements uploaded yet.</p> : null}
      <div className="divide-y rounded-lg border">
        {agreements.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
            <div className="min-w-0">
              <div className="truncate font-medium">{a.title}</div>
              <div className="truncate text-xs text-muted-foreground">
                {a.fileName} · {formatSize(a.size)} · {new Date(a.createdAt).toLocaleDateString('en-GB')}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={`/api/agreements/${a.id}`} className="text-sm text-primary underline-offset-4 hover:underline">
                Download
              </a>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300"
                disabled={pending}
                onClick={() =>
                  window.confirm(`Remove “${a.title}”? ${name} will no longer see it.`) &&
                  start(async () => {
                    const res = await deleteAgreement(a.id)
                    setMsg(res.ok ? { ok: true, text: 'Removed.' } : { ok: false, text: res.error })
                    router.refresh()
                  })
                }
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={upload} className="grid max-w-xl gap-3">
        <div className="space-y-2">
          <Label htmlFor="ag-title">Title (optional)</Label>
          <Input id="ag-title" placeholder="e.g. Commission agreement 2026" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ag-file">File</Label>
          <Input id="ag-file" ref={fileRef} type="file" accept={Object.keys(AGREEMENT_TYPES).join(',')} />
          <p className="text-xs text-muted-foreground">PDF, Word, image or text. Up to {MAX_AGREEMENT_BYTES / 1024 / 1024} MB. {name} will see it under Documents.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Uploading…' : 'Upload agreement'}
          </Button>
          {msg ? <p className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p> : null}
        </div>
      </form>
    </div>
  )
}
