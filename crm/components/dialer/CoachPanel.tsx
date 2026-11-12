'use client'

import { Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { coachStatus, type CoachStatus } from '@/app/actions/call-reviews'
import { CoachCard } from '@/components/calls/CoachCard'

/** Statuses where checking again can still change the answer. */
const OPEN_STATES: CoachStatus['state'][] = ['waiting', 'unavailable']
const FAST_MS = 4_000
const SLOW_MS = 15_000
const FAST_FOR_MS = 60_000

/**
 * The coaching moment inside the dialer, right after a call's wrap-up is saved. While the review is made it waits here
 * (checking now and then while the tab is open); when it's ready it shows the short coaching card. It never closes by
 * itself: the rep picks Done, Open full review, or Keep working.
 *
 * `onDone(unresolved)` tells the dialer the card is gone and whether the review was still on its way, so a later
 * "Review ready" watcher can pick it up. `onOpenReview` is called when the rep follows the link to the full review.
 */
export function CoachPanel({ callId, saved, onDone, onOpenReview }: { callId: string; saved: string | null; onDone: (unresolved: boolean) => void; onOpenReview: () => void }): React.ReactElement {
  const [status, setStatus] = useState<CoachStatus | null>(null)
  const [fails, setFails] = useState(0)
  const stateRef = useRef<CoachStatus['state'] | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    const started = Date.now()
    const tick = async (): Promise<void> => {
      if (cancelled) return
      // an open tab only: no checking in the background
      if (typeof document !== 'undefined' && document.hidden) return schedule()
      const r = await coachStatus(callId).catch(() => null)
      if (cancelled) return
      if (r && r.ok) {
        setFails(0)
        setStatus(r.data)
        stateRef.current = r.data.state
        if (!OPEN_STATES.includes(r.data.state) && !(r.data.state === 'failed' && r.data.willRetry)) return
      } else setFails((n) => n + 1)
      schedule()
    }
    const schedule = (): void => {
      timer = window.setTimeout(() => void tick(), Date.now() - started < FAST_FOR_MS ? FAST_MS : SLOW_MS)
    }
    const onVisible = (): void => {
      if (!document.hidden && !cancelled && (stateRef.current === null || OPEN_STATES.includes(stateRef.current))) {
        window.clearTimeout(timer)
        void tick()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    void tick()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [callId])

  const state = status?.state ?? null
  const unresolved = state === null || OPEN_STATES.includes(state) || (state === 'failed' && Boolean(status?.willRetry))
  const reviewHref = `/sales/calls/${callId}`
  const name = status?.name

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5" aria-live="polite">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your coach</div>
        {name ? <div className="mt-0.5 truncate text-sm text-muted-foreground">Call with {name}</div> : null}
        {saved ? (
          <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-300">
            <Check className="h-3.5 w-3.5" aria-hidden /> {saved}
          </div>
        ) : null}
      </div>

      {state === 'ready' && status?.card ? <CoachCard card={status.card} /> : null}

      {state === null || state === 'waiting' ? (
        <div className="rounded-xl bg-muted/50 px-3 py-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden /> Your coach is reviewing your call…
          </div>
          <p className="mt-2 text-[13px] leading-snug text-muted-foreground">You can keep working. Your review will be on this call’s page when it’s ready.</p>
          {fails >= 3 ? <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">We couldn’t check just now. Open the call to see where it stands.</p> : null}
        </div>
      ) : null}

      {state === 'unavailable' ? (
        <div className="rounded-xl bg-muted/50 px-3 py-4 text-[13px] leading-snug">
          <p className="font-medium">{status?.message}</p>
          <p className="mt-2 text-muted-foreground">You can keep working. It will show on this call’s page if it arrives.</p>
        </div>
      ) : null}

      {state === 'failed' ? (
        <div className="rounded-xl bg-muted/50 px-3 py-4 text-[13px] leading-snug">
          <p className="font-medium">{status?.message}</p>
        </div>
      ) : null}

      {state === 'skipped' ? (
        <div className="rounded-xl bg-muted/50 px-3 py-4 text-[13px] leading-snug">
          <p className="font-medium">No coaching for this call</p>
          <p className="mt-1 text-muted-foreground">{status?.message}</p>
        </div>
      ) : null}

      {state === 'none' ? <p className="rounded-xl bg-muted/50 px-3 py-4 text-[13px] leading-snug text-muted-foreground">{status?.message ?? 'There’s no review for this call.'}</p> : null}

      <div className="mt-auto flex gap-2 pt-1">
        {state === 'ready' || state === 'failed' || state === 'skipped' || state === 'unavailable' || (state === null && fails >= 3) ? (
          <Link href={reviewHref} onClick={onOpenReview} className="flex-1 rounded-xl border border-white/10 bg-primary py-2.5 text-center text-sm font-semibold text-white transition hover:bg-primary/90">
            {state === 'ready' ? 'Open full review' : 'Open the call'}
          </Link>
        ) : null}
        <button type="button" onClick={() => onDone(unresolved)} className="flex-1 rounded-xl border border-border bg-muted py-2.5 text-sm font-semibold transition hover:bg-muted/70">
          {unresolved ? 'Keep working' : 'Done'}
        </button>
      </div>
    </div>
  )
}
