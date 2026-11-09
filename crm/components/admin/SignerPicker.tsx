'use client'

import { Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveContractSigner } from '@/app/actions/contract-signers'
import { SignaturePad } from '@/components/SignaturePad'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export interface SignerView {
  userId: string
  /** Name shown on the contract (saved name, or the login name until one is saved) */
  name: string
  title: string
  /** PNG data URL, '' when this admin has not drawn one yet */
  signature: string
  /** a saved signature's name in the list (Settings → Signatures) */
  label?: string
}

/** Every admin who can sign for the company: pick who signs this contract, or edit anyone's signature. */
export function SignerPicker({ signers, selected = '', onSelect, meId, selectable = true }: { signers: SignerView[]; selected?: string; onSelect?: (id: string) => void; meId: string; selectable?: boolean }): React.ReactElement {
  const router = useRouter()
  const [editing, setEditing] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [sig, setSig] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()

  function open(s: SignerView): void {
    setEditing(s.userId)
    setName(s.name)
    setTitle(s.title)
    setSig(s.signature)
    setMsg(null)
  }
  function save(): void {
    if (!editing) return
    start(async () => {
      const res = await saveContractSigner(editing, { name, title, signature: sig })
      setMsg(res.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: res.error })
      if (res.ok) {
        setEditing(null)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{selectable ? 'Who signs for the company' : 'Signatures of the admins who sign for the company'}</p>
      <div className="divide-y rounded-lg border">
        {signers.map((s) => (
          <div key={s.userId} className="space-y-3 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                {selectable ? <input type="radio" name="signer" checked={selected === s.userId} onChange={() => onSelect?.(s.userId)} disabled={!s.signature} /> : null}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {s.name}
                    {s.userId === meId ? ' (you)' : ''}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{s.title || 'No title'}</span>
                </span>
              </label>
              {s.signature ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.signature} alt={`Signature of ${s.name}`} className="h-10 max-w-[140px] rounded bg-white object-contain p-1" />
              ) : (
                <span className="text-xs text-amber-400">No signature yet</span>
              )}
              <Button type="button" size="sm" variant="outline" onClick={() => (editing === s.userId ? setEditing(null) : open(s))}>
                <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden />
                {editing === s.userId ? 'Close' : s.signature ? 'Edit signature' : 'Add signature'}
              </Button>
            </div>
            {editing === s.userId ? (
              <div className="space-y-3 rounded-md bg-muted/40 p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium">Name on the contract</span>
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="font-medium">Title (optional)</span>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Founder" />
                  </label>
                </div>
                <div className="rounded-md bg-white p-2">
                  <SignaturePad onChange={setSig} label={`Draw the signature for ${s.name}`} />
                </div>
                <p className="text-xs text-muted-foreground">Draw it, then Save. Only the person whose signature this is should draw it. Every change is recorded with who made it.</p>
                <div className="flex gap-2">
                  <Button size="sm" disabled={pending || !sig || name.trim().length < 2} onClick={save}>
                    {pending ? 'Saving…' : 'Save signature'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
                {msg && !msg.ok ? <p className="text-sm text-red-500">{msg.text}</p> : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
