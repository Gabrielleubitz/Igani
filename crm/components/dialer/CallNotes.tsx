'use client'

import { ChevronDown, StickyNote } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { callNotes, type CallNoteItem } from '@/app/actions/calls'
import { cn } from '@/lib/utils'

/** Notes an admin sent during the call, and the ones that just arrived (shown as a toast for a few seconds). */
export interface TeamNotesState {
  notes: CallNoteItem[]
  fresh: CallNoteItem[]
}

const EMPTY: TeamNotesState = { notes: [], fresh: [] }
const POLL_MS = 2000
const TOAST_MS = 10_000

/**
 * Notes from an admin listening in (Calls → Live now), polled every couple of seconds while the call is live. Pass null
 * when there's nothing to poll for (no call, a private call): the poll stops by itself once the call has ended.
 */
export function useTeamNotes(callId: string | null): TeamNotesState {
  // kept with the call it belongs to, so a new call starts from nothing without a reset
  const [state, setState] = useState<TeamNotesState & { callId: string | null }>({ ...EMPTY, callId: null })
  useEffect(() => {
    if (!callId) return
    let stop = false
    let since = 0
    let timer: number | null = null
    const seen = new Set<string>()
    const tick = async (): Promise<void> => {
      if (stop) return
      const r = await callNotes(callId, since).catch(() => null)
      if (stop) return
      if (r?.ok) {
        const fresh = r.data.notes.filter((n) => !seen.has(n.id))
        for (const n of fresh) {
          seen.add(n.id)
          since = Math.max(since, new Date(n.createdAt).getTime() - 1)
        }
        if (fresh.length) {
          setState((s) => (s.callId === callId ? { callId, notes: [...s.notes, ...fresh], fresh: [...s.fresh, ...fresh] } : { callId, notes: fresh, fresh }))
          const ids = new Set(fresh.map((n) => n.id))
          window.setTimeout(() => {
            if (!stop) setState((s) => (s.callId === callId ? { ...s, fresh: s.fresh.filter((f) => !ids.has(f.id)) } : s))
          }, TOAST_MS)
        }
        if (!r.data.live) return // the call is over: nothing more will come
      }
      timer = window.setTimeout(() => void tick(), POLL_MS)
    }
    void tick()
    return () => {
      stop = true
      if (timer != null) window.clearTimeout(timer)
    }
  }, [callId])
  return useMemo(() => (callId && state.callId === callId ? { notes: state.notes, fresh: state.fresh } : EMPTY), [callId, state])
}

const time = (iso: string): string => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/** On the call screen: each new note pops up for ten seconds, and a small list keeps all of them for the call. */
export function TeamNotes({ state, className }: { state: TeamNotesState; className?: string }): React.ReactElement | null {
  const [open, setOpen] = useState(false)
  if (!state.notes.length) return null
  return (
    <div className={cn('w-full space-y-2', className)}>
      {state.fresh.length ? (
        <div className="space-y-2" role="status" aria-live="assertive">
          {state.fresh.map((n) => (
            <div key={n.id} className="rounded-xl border border-sky-400/50 bg-sky-500/15 px-3 py-2.5 text-sm text-sky-50 shadow-lg shadow-sky-950/30 animate-in fade-in slide-in-from-top-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200">Note from {n.author}</div>
              <div dir="auto" className="mt-0.5 font-medium">
                {n.body}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">
        <StickyNote className="h-3.5 w-3.5" aria-hidden />
        Notes from the team · {state.notes.length}
        <ChevronDown className={cn('ml-auto h-3.5 w-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open ? (
        <ul className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm">
          {state.notes.map((n) => (
            <li key={n.id} dir="auto" className="flex gap-2">
              <span className="shrink-0 tabular-nums text-xs text-muted-foreground">{time(n.createdAt)}</span>
              <span>
                <span className="text-muted-foreground">{n.author}: </span>
                {n.body}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
