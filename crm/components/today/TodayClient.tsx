'use client'

import { Check, CalendarDays, ChevronDown, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore, useTransition } from 'react'
import { completeTask } from '@/app/sales/actions'
import { useDialer } from '@/components/dialer/Dialer'
import { TodayCalendar, type CalendarItem } from '@/components/crm/TodayCalendar'
import { cn } from '@/lib/utils'

/** A clock that ticks every 30 s (shared, so many pills cost one timer). */
const listeners = new Set<() => void>()
let tick = Date.now()
let timer: number | null = null
function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  if (timer === null) {
    timer = window.setInterval(() => {
      tick = Date.now()
      listeners.forEach((l) => l())
    }, 30_000)
  }
  return () => {
    listeners.delete(fn)
    if (!listeners.size && timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  }
}
const useNow = (serverNow: number): number => useSyncExternalStore(subscribe, () => tick, () => serverNow)

/** "in 12 min" / "Live" / "Done" next to a timeline item, kept current without reloading. */
export function StartsIn({ start, end, serverNow, live }: { start: string; end: string | null; serverNow: number; live?: boolean }): React.ReactElement | null {
  const now = useNow(serverNow)
  const s = new Date(start).getTime()
  const e = end ? new Date(end).getTime() : s + 30 * 60_000
  if (live || (now >= s && now < e))
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden /> Now
      </span>
    )
  if (now >= e) return <span className="text-xs text-muted-foreground/70">Done</span>
  const min = Math.round((s - now) / 60_000)
  if (min <= 60)
    return <span className="whitespace-nowrap rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.7)]">in {Math.max(1, min)} min</span>
  return null
}

/** Opens the phone on the Lists tab (or goes to the call list when the dialer isn't available). */
export function StartCalling({ href, className, children }: { href: string; className?: string; children: React.ReactNode }): React.ReactElement {
  const dialer = useDialer()
  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (!dialer) return
        e.preventDefault()
        dialer.open('lists')
      }}
    >
      {children}
    </Link>
  )
}

const KEY = 'today.calendar.open'

/** The full calendar, folded away until you want it (remembered per browser). Only built when opened. */
export function CalendarSection({ items, timeZone, summary }: { items: CalendarItem[]; timeZone: string; summary: string }): React.ReactElement {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    try {
      if (window.location.hash === '#calendar' || window.localStorage.getItem(KEY) === '1') setOpen(true)
    } catch {
      /* storage blocked */
    }
    const onHash = (): void => {
      if (window.location.hash === '#calendar') setOpen(true)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const toggle = (): void => {
    setOpen((o) => {
      try {
        window.localStorage.setItem(KEY, o ? '0' : '1')
      } catch {
        /* storage blocked */
      }
      return !o
    })
  }
  return (
    <section id="calendar" className="scroll-mt-6 overflow-hidden rounded-2xl border bg-card/60">
      <button type="button" onClick={toggle} aria-expanded={open} className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-muted/30">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/25">
          <CalendarDays className="h-[18px] w-[18px]" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Calendar</span>
          <span className="block truncate text-xs text-muted-foreground">{summary}</span>
        </span>
        <span className="hidden text-xs text-muted-foreground sm:inline">{open ? 'Hide' : 'Day & month view'}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open ? (
        <div className="border-t px-2 pb-2 pt-3 sm:px-4 sm:pb-4">
          <TodayCalendar items={items} timeZone={timeZone} />
        </div>
      ) : null}
    </section>
  )
}

/** Tick a task off right from Today. */
export function DoneButton({ leadId, taskId, className }: { leadId: string; taskId: string; className?: string }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState(false)
  return (
    <button
      type="button"
      disabled={pending || done}
      title={error ? 'Couldn’t save. Try again.' : 'Mark as done'}
      onClick={() =>
        start(async () => {
          const r = await completeTask(leadId, taskId)
          if (r.ok) {
            setDone(true)
            router.refresh()
          } else setError(true)
        })
      }
      className={cn(className, done && 'border-emerald-500/40 text-emerald-300', error && 'border-rose-500/50 text-rose-300')}
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />}
      Done
    </button>
  )
}
