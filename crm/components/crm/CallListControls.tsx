'use client'

import { Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { deleteCallList, makeProspectLead, refreshProspectDetails, removeProspect, setProspectStatus, updateCallList } from '@/app/actions/call-lists'
import { CallLink } from '@/components/dialer/Dialer'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/** Rename the list, hand it to a teammate (admins), or delete it (two clicks). */
export function CallListHeader({ listId, name, ownerId, teammates }: { listId: string; name: string; ownerId: string | null; teammates: { id: string; name: string }[] | null }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void): void =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) return setError(r.error ?? 'Something went wrong.')
      after?.()
      router.refresh()
    })
  return (
    <div className="flex flex-wrap items-center gap-2">
      {editing ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => updateCallList({ listId, name: value }), () => setEditing(false))
          }}
        >
          <Input value={value} onChange={(e) => setValue(e.target.value)} maxLength={120} dir="auto" className="h-9 w-56" autoFocus />
          <Button type="submit" size="sm" disabled={pending || !value.trim()}>
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
          Rename
        </Button>
      )}
      {teammates ? (
        <Select aria-label="Who calls this list" value={ownerId ?? ''} disabled={pending} onChange={(e) => e.target.value && run(() => updateCallList({ listId, ownerId: e.target.value }))} className="h-9 w-auto">
          {ownerId ? null : <option value="">Nobody</option>}
          {teammates.map((t) => (
            <option key={t.id} value={t.id}>
              Called by {t.name}
            </option>
          ))}
        </Select>
      ) : null}
      {confirm ? (
        <span className="inline-flex items-center gap-2 text-sm">
          Delete the list and everyone on it?
          <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => run(() => deleteCallList(listId), () => router.push('/sales/call-lists'))}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirm(false)}>
            Keep
          </Button>
        </span>
      ) : (
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirm(true)} className="text-muted-foreground">
          <Trash2 className="me-1 h-4 w-4" /> Delete list
        </Button>
      )}
      {error ? <span className="text-sm text-rose-400">{error}</span> : null}
    </div>
  )
}

/** Call, make a lead, skip, put back, remove: one business on a list. */
export function ProspectActions({ prospect }: { prospect: { id: string; name: string; phone: string; status: string; leadId: string | null } }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>): void =>
    start(async () => {
      setError(null)
      const r = await fn()
      if (!r.ok) setError(r.error ?? 'Something went wrong.')
      router.refresh()
    })
  const open = prospect.status === 'TO_CALL' || prospect.status === 'CALLBACK'
  const btn = 'rounded-md border px-2 py-1 text-xs transition disabled:opacity-50'
  if (prospect.status === 'CONVERTED')
    return prospect.leadId ? (
      <a href={`/sales/leads/${prospect.leadId}`} className={cn(btn, 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10')}>
        Open lead →
      </a>
    ) : (
      <span className="text-xs text-muted-foreground">Became a lead</span>
    )
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
      {open ? (
        <>
          <CallLink phone={prospect.phone} prospect={{ id: prospect.id, name: prospect.name }} className={cn(btn, 'border-emerald-500/40 bg-emerald-500/10 font-medium text-emerald-300 hover:bg-emerald-600 hover:text-white')}>
            Call
          </CallLink>
          <button type="button" disabled={pending} onClick={() => run(() => makeProspectLead(prospect.id))} className={cn(btn, 'hover:border-primary/60')}>
            Make lead
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => setProspectStatus({ prospectId: prospect.id, status: 'NOT_INTERESTED' }))} className={cn(btn, 'text-muted-foreground hover:text-foreground')}>
            Skip
          </button>
        </>
      ) : (
        <button type="button" disabled={pending} onClick={() => run(() => setProspectStatus({ prospectId: prospect.id, status: 'TO_CALL' }))} className={cn(btn, 'text-muted-foreground hover:text-foreground')}>
          Put back
        </button>
      )}
      <button type="button" disabled={pending} onClick={() => run(() => removeProspect(prospect.id))} aria-label={`Remove ${prospect.name}`} className={cn(btn, 'border-transparent text-muted-foreground hover:text-rose-300')}>
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      {error ? <span className="basis-full text-end text-xs text-rose-400">{error}</span> : null}
    </span>
  )
}

/** "Look again": re-read the business's website now. */
export function RefreshDetails({ prospectId, label = 'Look again' }: { prospectId: string; label?: string }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null)
            const r = await refreshProspectDetails(prospectId)
            if (!r.ok) setMsg(r.error)
            else if (r.data.status === 'failed') setMsg('Their website couldn’t be read.')
            router.refresh()
          })
        }
        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        {pending ? 'Reading their website…' : label}
      </button>
      {msg ? <span className="text-xs text-rose-400">{msg}</span> : null}
    </span>
  )
}

/** While websites are being read, check back every few seconds. */
export function DetailsRefresher({ active }: { active: boolean }): null {
  const router = useRouter()
  useEffect(() => {
    if (!active) return
    const t = window.setInterval(() => router.refresh(), 8000)
    return () => window.clearInterval(t)
  }, [active, router])
  return null
}
