'use client'

import { Loader2, UserPlus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { shareCall, unshareCall } from '@/app/actions/call-shares'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'

export interface Person {
  id: string
  name: string
}

/** Admin: add a salesman to this call so he can open it from his own Calls list (not counted in his stats). */
export function ShareCall({ callId, candidates, shared }: { callId: string; candidates: Person[]; shared: Person[] }): React.ReactElement {
  const router = useRouter()
  const [pick, setPick] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const left = candidates.filter((c) => !shared.some((s) => s.id === c.id))
  const run = (fn: () => ReturnType<typeof shareCall>): void => {
    setErr(null)
    start(async () => {
      const r = await fn()
      if (!r.ok) setErr(r.error)
      else {
        setPick('')
        router.refresh()
      }
    })
  }
  return (
    <div className="rounded-xl border bg-card p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">Shared with</span>
        {shared.length === 0 ? <span className="text-muted-foreground">nobody yet</span> : null}
        {shared.map((s) => (
          <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5">
            {s.name}
            <button type="button" aria-label={`Remove ${s.name}`} disabled={pending} onClick={() => run(() => unshareCall({ callId, userId: s.id }))} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      {left.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Select aria-label="Add a salesman" value={pick} onChange={(e) => setPick(e.target.value)} className="max-w-56">
            <option value="">Add a salesman…</option>
            {left.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Button type="button" size="sm" disabled={!pick || pending} onClick={() => run(() => shareCall({ callId, userId: pick }))}>
            {pending ? <Loader2 className="me-1.5 h-4 w-4 animate-spin" /> : <UserPlus className="me-1.5 h-4 w-4" />} Add
          </Button>
        </div>
      ) : null}
      <p className="mt-2 text-xs text-muted-foreground">He can open the recording, transcript and review from his Calls list. It does not count in his call numbers or average score.</p>
      {err ? <p className="mt-1 text-xs text-rose-400">{err}</p> : null}
    </div>
  )
}
