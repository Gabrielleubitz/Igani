'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteBooking, markBookingDone } from '@/app/actions/bookings'
import { Button } from '@/components/ui/button'

/** Mark a meeting as done (or undo that), or delete it for good. Shown to the host and admins. */
export function MeetingRowActions({ bookingId, done, cancelled, title }: { bookingId: string; done: boolean; cancelled: boolean; title: string }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>): void =>
    start(async () => {
      const res = await fn()
      setError(res.ok ? null : (res.error ?? 'Failed'))
      router.refresh()
    })
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!cancelled ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => markBookingDone(bookingId, !done))}>
          {done ? 'Undo done' : 'Mark done'}
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        className="text-red-400 hover:text-red-300"
        onClick={() => window.confirm(`Delete “${title}” for good? It disappears from the list and the calendar event is removed. If it is still upcoming, it is also removed from everyone invited.`) && run(() => deleteBooking(bookingId))}
      >
        Delete
      </Button>
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  )
}
