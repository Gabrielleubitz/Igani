'use client'

import { Ear, EarOff, MessageSquare, PhoneCall, Radio } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { liveCalls, type LiveCall } from '@/app/actions/calls'
import { listenToCall } from '@/components/dialer/voice'
import { cn } from '@/lib/utils'

const clock = (from: string, now: number): string => {
  const s = Math.max(0, Math.round((now - new Date(from).getTime()) / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Admins: calls happening right now, with Listen to join one silently. Hidden when nobody is on the phone. */
export function LiveNow(): React.ReactElement | null {
  const [calls, setCalls] = useState<LiveCall[]>([])
  const [listenIn, setListenIn] = useState(true)
  const [now, setNow] = useState(() => Date.now())
  const [listening, setListening] = useState<{ callId: string; live: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const session = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    let stop = false
    const load = async (): Promise<void> => {
      if (document.hidden) return
      const r = await liveCalls()
      if (!stop && r.ok) {
        setCalls(r.data.calls)
        setListenIn(r.data.listenIn)
      }
    }
    void load()
    const t = window.setInterval(() => void load(), 4000)
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      stop = true
      window.clearInterval(t)
      window.clearInterval(tick)
    }
  }, [])
  useEffect(() => () => session.current?.stop(), [])

  const listen = async (c: LiveCall): Promise<void> => {
    session.current?.stop()
    setError(null)
    setListening({ callId: c.callId, live: false })
    try {
      session.current = await listenToCall(c.callId, {
        onLive: () => setListening((l) => (l?.callId === c.callId ? { ...l, live: true } : l)),
        onEnd: (e) => {
          session.current = null
          setListening((l) => (l?.callId === c.callId ? null : l))
          if (e) setError(e)
        },
      })
    } catch (e) {
      setListening(null)
      setError(e instanceof Error ? e.message : 'Could not listen in.')
    }
  }
  const stopListening = (): void => {
    session.current?.stop()
    session.current = null
    setListening(null)
  }

  if (!calls.length && !listening) return null
  const active = listening ? calls.find((c) => c.callId === listening.callId) : null
  return (
    <section aria-label="Live calls" className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </span>
        <h2 className="text-sm font-semibold">Live now</h2>
        <span className="text-xs text-muted-foreground">
          {calls.length} {calls.length === 1 ? 'call' : 'calls'}
        </span>
        {!listenIn ? (
          <Link href="/admin/phone#listen-in" className="ml-auto text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            Turn on listening in
          </Link>
        ) : null}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {calls.map((c) => {
          const on = listening?.callId === c.callId
          return (
            <li key={c.callId} className={cn('flex items-center gap-3 rounded-xl border bg-card/70 px-3 py-2.5 transition-colors', on && 'border-emerald-400/60 bg-emerald-500/10')}>
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', c.status === 'IN_PROGRESS' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300')}>
                {on ? <Radio className="h-[18px] w-[18px] animate-pulse" /> : <PhoneCall className="h-[18px] w-[18px]" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {c.rep.name} <span className="text-muted-foreground">→</span> {c.contact}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {c.status === 'IN_PROGRESS' && c.answeredAt ? <span className="tabular-nums text-emerald-300">{clock(c.answeredAt, now)}</span> : <span className="text-amber-300">Ringing…</span>}
                  {c.company ? ` · ${c.company}` : ` · ${c.number}`}
                </div>
              </div>
              {c.rep.id ? (
                <Link href={`/sales/chat?dm=${c.rep.id}`} title={`Message ${c.rep.name}`} aria-label={`Message ${c.rep.name}`} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <MessageSquare className="h-4 w-4" />
                </Link>
              ) : null}
              {c.canListen ? (
                on ? (
                  <button type="button" onClick={stopListening} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-400">
                    <EarOff className="h-3.5 w-3.5" /> Stop
                  </button>
                ) : (
                  <button type="button" onClick={() => void listen(c)} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10">
                    <Ear className="h-3.5 w-3.5" /> Listen
                  </button>
                )
              ) : (
                <span className="shrink-0 text-[11px] text-muted-foreground" title={listenIn ? 'Started before listening in was on, or a call coming in' : 'Listening in is off'}>
                  {listenIn ? 'Can’t join' : ''}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {listening ? (
        <p role="status" className="mt-3 flex items-center gap-2 text-xs text-emerald-200">
          <Ear className="h-3.5 w-3.5" />
          {listening.live ? `Listening${active ? ` to ${active.rep.name} and ${active.contact}` : ''}. You’re muted; they can’t hear you or see that you joined.` : 'Joining the call…'}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-xs text-rose-300">
          {error}
        </p>
      ) : null}
    </section>
  )
}
