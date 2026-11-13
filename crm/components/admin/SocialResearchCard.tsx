'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { refreshSocialResearch, saveSocialResearch } from '@/app/actions/social-test'

const when = (ms: number): string => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/** Admin → Settings: the saved research brief that every "Post now" post is written from. */
export function SocialResearchCard({ initial }: { initial: { text: string; createdAt: number; source: 'ai' | 'admin' } | null }): React.ReactElement {
  const [text, setText] = useState(initial?.text ?? '')
  const [saved, setSaved] = useState(initial)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<'refresh' | 'save' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const dirty = text !== (saved?.text ?? '')

  async function refresh(): Promise<void> {
    if (dirty && !confirm('Replace your edits with new research?')) return
    setBusy('refresh'); setMsg(null)
    const r = await refreshSocialResearch()
    setBusy(null)
    if (!r.ok) return setMsg({ ok: false, text: r.error })
    setText(r.text); setSaved({ text: r.text, createdAt: r.createdAt, source: 'ai' }); setOpen(true)
    setMsg({ ok: true, text: 'New research saved. Posts from now on use it.' })
  }
  async function save(): Promise<void> {
    setBusy('save'); setMsg(null)
    const r = await saveSocialResearch(text)
    setBusy(null)
    if (!r.ok) return setMsg({ ok: false, text: r.error })
    setSaved({ text, createdAt: r.createdAt, source: 'admin' })
    setMsg({ ok: true, text: 'Saved.' })
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 text-muted-foreground">
          {saved ? `Saved ${when(saved.createdAt)}${saved.source === 'admin' ? ', edited by an admin' : ', researched on the web'}. Every post is written from it; it isn't redone each time.` : 'No research yet. The first "Post now" researches once and saves it here, or start it now.'}
        </p>
        {saved && <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)}>{open ? 'Hide' : 'Show and edit'}</Button>}
        <Button size="sm" variant={saved ? 'outline' : 'default'} disabled={busy !== null} onClick={refresh}>{busy === 'refresh' ? 'Researching… (a minute or two)' : saved ? 'Research again' : 'Research now'}</Button>
      </div>
      {msg && <p className={msg.ok ? 'rounded-md bg-muted px-3 py-2' : 'rounded-md bg-red-500/10 px-3 py-2 text-red-600'}>{msg.text}</p>}
      {open && (
        <div className="space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={16} className="w-full rounded-md border bg-background p-2 font-mono text-xs" aria-label="Research brief" />
          <div className="flex justify-end gap-2">
            {dirty && <Button variant="outline" size="sm" onClick={() => setText(saved?.text ?? '')}>Undo edits</Button>}
            <Button size="sm" disabled={!dirty || busy !== null} onClick={save}>{busy === 'save' ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      )}
    </div>
  )
}
