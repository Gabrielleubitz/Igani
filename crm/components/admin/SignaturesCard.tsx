'use client'

import { ImageUp, PenLine, Plus, Star, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { deleteSignature, saveSignature, setDefaultSignature } from '@/app/actions/signatures'
import { SignaturePad } from '@/components/SignaturePad'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import type { SignatureView } from '@/lib/signatures'
import { cn } from '@/lib/utils'

type Draft = { id?: string; label: string; name: string; title: string; email: string; phone: string; image: string; isDefault: boolean }
const empty: Draft = { label: '', name: '', title: '', email: '', phone: '', image: '', isDefault: false }

/** Any image → a PNG on transparent white-free background, trimmed and at most 900 px wide (keeps it small). */
async function toPng(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => bad(new Error('That file isn’t an image we can read.'))
      i.src = url
    })
    const scale = Math.min(1, 900 / img.width)
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.round(img.width * scale))
    c.height = Math.max(1, Math.round(img.height * scale))
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0, c.width, c.height)
    // a scanned signature on white paper: make the white see-through, so it sits on the contract like ink
    const data = ctx.getImageData(0, 0, c.width, c.height)
    for (let p = 0; p < data.data.length; p += 4) {
      const lum = (data.data[p]! + data.data[p + 1]! + data.data[p + 2]!) / 3
      if (lum > 225) data.data[p + 3] = 0
      else if (lum > 170) data.data[p + 3] = Math.round(((225 - lum) / 55) * data.data[p + 3]!)
    }
    ctx.putImageData(data, 0, 0)
    return c.toDataURL('image/png')
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Settings → Signatures: the signatures Igani can sign with. Sales contracts and offer contracts pick one; one is the default. */
export function SignaturesCard({ signatures }: { signatures: SignatureView[] }): React.ReactElement {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [mode, setMode] = useState<'draw' | 'upload'>('draw')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const file = useRef<HTMLInputElement>(null)

  const open = (s?: SignatureView): void => {
    setError(null)
    setMode(s ? 'upload' : 'draw')
    setDraft(s ? { id: s.id, label: s.label, name: s.name, title: s.title, email: s.email, phone: s.phone, image: s.image, isDefault: s.isDefault } : { ...empty, isDefault: signatures.length === 0 })
  }
  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, done?: () => void): void =>
    start(async () => {
      const r = await fn()
      if (!r.ok) setError(r.error ?? 'Something went wrong.')
      else {
        done?.()
        router.refresh()
      }
    })

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {signatures.map((s) => (
          <div key={s.id} className={cn('group relative flex flex-col overflow-hidden rounded-xl border bg-card', s.isDefault && 'border-primary/60 ring-1 ring-primary/30')}>
            <button type="button" onClick={() => open(s)} className="flex h-28 items-center justify-center bg-white p-3" aria-label={`Edit ${s.label}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- a data URL */}
              <img src={s.image} alt={`Signature: ${s.name}`} className="max-h-full max-w-full object-contain" />
            </button>
            <div className="flex flex-1 items-start gap-2 border-t p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{s.label}</span>
                  {s.isDefault ? <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">Default</span> : null}
                </div>
                {s.label !== [s.name, s.title].filter(Boolean).join(' · ') ? <div className="truncate text-xs text-muted-foreground">{[s.name, s.title].filter(Boolean).join(' · ')}</div> : null}
                {s.email || s.phone ? <div className="truncate text-xs text-muted-foreground">{[s.email, s.phone].filter(Boolean).join(' · ')}</div> : null}
              </div>
              <div className="flex shrink-0 items-center">
                {!s.isDefault ? (
                  <button type="button" title="Make default" aria-label="Make default" disabled={pending} onClick={() => act(() => setDefaultSignature(s.id))} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-amber-400">
                    <Star className="h-4 w-4" />
                  </button>
                ) : null}
                <button type="button" title="Edit" aria-label="Edit" onClick={() => open(s)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <PenLine className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Delete"
                  aria-label="Delete"
                  disabled={pending}
                  onClick={() => window.confirm(`Delete “${s.label}”? Contracts already signed with it keep it.`) && act(() => deleteSignature(s.id))}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-rose-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => open()} className="flex min-h-[176px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Plus className="h-5 w-5" />
          </span>
          Add a signature
        </button>
      </div>
      {error && !draft ? <p className="text-sm text-rose-400">{error}</p> : null}

      <Dialog open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? 'Edit signature' : 'Add a signature'} description="Who signs for Igani, and how it looks on the contract.">
        {draft ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              act(() => saveSignature(draft), () => setDraft(null))
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="sg-name">Name (as signed)</Label>
                <Input id="sg-name" className="mt-1" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required maxLength={120} />
              </div>
              <div>
                <Label htmlFor="sg-title">Title</Label>
                <Input id="sg-title" className="mt-1" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="CEO" maxLength={120} />
              </div>
              <div>
                <Label htmlFor="sg-email">Email (optional)</Label>
                <Input id="sg-email" type="email" className="mt-1" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} maxLength={254} />
              </div>
              <div>
                <Label htmlFor="sg-phone">Phone (optional)</Label>
                <Input id="sg-phone" className="mt-1" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} maxLength={40} />
              </div>
            </div>
            <div>
              <Label htmlFor="sg-label">Name in the list (optional)</Label>
              <Input id="sg-label" className="mt-1" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder={draft.name ? (draft.title ? `${draft.name} · ${draft.title}` : draft.name) : 'e.g. Gabriel · CEO'} maxLength={80} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <Label>Signature</Label>
                <div className="flex rounded-lg border p-0.5 text-xs">
                  {(['draw', 'upload'] as const).map((m) => (
                    <button key={m} type="button" onClick={() => setMode(m)} className={cn('rounded-md px-2.5 py-1 font-medium', mode === m ? 'bg-primary/15 text-foreground' : 'text-muted-foreground')}>
                      {m === 'draw' ? 'Draw' : 'Upload'}
                    </button>
                  ))}
                </div>
              </div>
              {mode === 'draw' ? (
                <SignaturePad label="Draw the signature" onChange={(png) => setDraft((d) => (d ? { ...d, image: png } : d))} maxWidth={520} />
              ) : (
                <div className="space-y-2">
                  <div className="flex h-32 items-center justify-center rounded-lg border bg-white p-3">
                    {draft.image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- a data URL
                      <img src={draft.image} alt="Signature preview" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-slate-500">No signature yet</span>
                    )}
                  </div>
                  <input
                    ref={file}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      try {
                        const png = await toPng(f)
                        setDraft((d) => (d ? { ...d, image: png } : d))
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Could not read that image.')
                      }
                      e.target.value = ''
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => file.current?.click()}>
                    <ImageUp className="mr-1.5 h-4 w-4" /> {draft.image ? 'Replace with a file' : 'Choose a file'}
                  </Button>
                  <p className="text-xs text-muted-foreground">A photo or scan of the signature on white paper works: the white becomes see-through.</p>
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.isDefault} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })} />
              Use this one by default
            </label>
            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !draft.name.trim() || !draft.image}>
                {pending ? 'Saving…' : 'Save signature'}
              </Button>
            </div>
          </form>
        ) : null}
      </Dialog>
    </div>
  )
}

/** Pick which saved signature signs (default first). Used when approving an offer contract and when making a sales contract link. */
export function SignaturePicker({ signatures, value, onChange }: { signatures: Pick<SignatureView, 'id' | 'label' | 'name' | 'title' | 'image' | 'isDefault'>[]; value: string; onChange: (id: string) => void }): React.ReactElement {
  if (!signatures.length)
    return (
      <p className="text-sm text-amber-400">
        No signatures yet. <a href="/admin/settings#signatures" className="underline underline-offset-2">Add one in Settings → Signatures</a>.
      </p>
    )
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {signatures.map((s) => (
        <label key={s.id} className={cn('flex cursor-pointer items-center gap-3 rounded-lg border p-2 transition-colors', value === s.id ? 'border-primary/70 bg-primary/10' : 'hover:bg-muted/50')}>
          <input type="radio" name="signature" className="sr-only" checked={value === s.id} onChange={() => onChange(s.id)} />
          <span className="flex h-11 w-20 shrink-0 items-center justify-center rounded-md bg-white p-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- a data URL */}
            <img src={s.image} alt="" className="max-h-full max-w-full object-contain" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{s.label}</span>
            <span className="block truncate text-xs text-muted-foreground">{[s.label !== [s.name, s.title].filter(Boolean).join(' · ') ? [s.name, s.title].filter(Boolean).join(' · ') : null, s.isDefault ? 'Default' : null].filter(Boolean).join(' · ') || '\u00a0'}</span>
          </span>
        </label>
      ))}
    </div>
  )
}
