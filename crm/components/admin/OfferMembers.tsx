'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setOfferMembers } from '@/app/actions/offers'
import { Button } from '@/components/ui/button'

interface Person {
  id: string
  label: string
}

/** Who works on this offer: its creator plus invited salespeople. Admins always see every offer. */
export function OfferMembers({ offerId, creator, people, initial, salesEnabled }: { offerId: string; creator: string | null; people: Person[]; initial: string[]; salesEnabled: boolean }): React.ReactElement {
  const router = useRouter()
  const [picked, setPicked] = useState(new Set(initial))
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const dirty = picked.size !== initial.length || initial.some((id) => !picked.has(id))

  function save(): void {
    setMsg(null)
    start(async () => {
      const res = await setOfferMembers({ id: offerId, memberIds: [...picked] })
      setMsg(res.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: res.error })
      if (res.ok) router.refresh()
    })
  }

  return (
    <div className="space-y-3 text-sm">
      <div>
        <span className="text-muted-foreground">Created by </span>
        <span className="font-medium">{creator ?? 'Unknown'}</span>
      </div>
      {people.length ? (
        <div className="flex flex-wrap gap-2">
          {people.map((p) => {
            const on = picked.has(p.id)
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  setPicked((cur) => {
                    const n = new Set(cur)
                    on ? n.delete(p.id) : n.add(p.id)
                    return n
                  })
                }
                className={`rounded-full border px-3 py-1 text-sm transition ${on ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted'}`}
              >
                {on ? '✓ ' : ''}
                {p.label}
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-muted-foreground">No salespeople on the team yet.</p>
      )}
      <div className="flex items-center gap-3">
        <Button size="sm" variant="outline" onClick={save} disabled={!dirty || pending}>
          {pending ? 'Saving…' : 'Save team'}
        </Button>
        {msg ? <span className={msg.ok ? 'text-emerald-400' : 'text-rose-400'}>{msg.text}</span> : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Admins see every offer. Salespeople see only offers they created or were invited to{salesEnabled ? '.' : ' (once Offers opens to the sales team; today only admins have it).'}
      </p>
    </div>
  )
}
