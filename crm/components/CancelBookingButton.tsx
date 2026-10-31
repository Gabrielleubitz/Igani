'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { approveBooking, cancelBooking } from '@/app/actions/bookings'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Label, Textarea } from '@/components/ui/input'

/** Approve (admins, pending public requests) and cancel/decline with an optional emailed notice to the guest. */
export function BookingActions({ bookingId, canApprove, guestName }: { bookingId: string; canApprove: boolean; guestName?: string }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [notify, setNotify] = useState(true)
  const [reason, setReason] = useState('')
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string): void =>
    start(async () => {
      const res = await fn()
      setError(res.ok ? null : (res.error ?? 'Failed'))
      if (res.ok) setDone(ok)
      router.refresh()
    })
  const verb = canApprove ? 'Decline' : 'Cancel'
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canApprove ? (
        <Button size="sm" disabled={pending} onClick={() => run(() => approveBooking(bookingId), 'Approved, confirmation sent.')}>
          {pending ? 'Working…' : 'Approve'}
        </Button>
      ) : null}
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => {
          setNotify(true)
          setReason('')
          setAsking(true)
        }}
      >
        {verb}
      </Button>
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
      {done && !error ? <span className="text-xs text-emerald-400">{done}</span> : null}
      <Dialog open={asking} onClose={() => setAsking(false)} title={`${verb} this meeting?`} description="The time is released and the calendar event (if any) is removed.">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setAsking(false)
            run(() => cancelBooking(bookingId, reason.trim() || (canApprove ? 'declined-by-admin' : 'cancelled-by-staff'), notify), canApprove ? 'Declined.' : 'Cancelled.')
          }}
        >
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            <span>
              Email {guestName ?? 'the guest'} a branded notice{canApprove ? ' with a link to pick another time' : ''}
            </span>
          </label>
          <div className="space-y-1">
            <Label htmlFor={`reason-${bookingId}`}>Internal reason (optional, not sent)</Label>
            <Textarea id={`reason-${bookingId}`} rows={2} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setAsking(false)}>
              Keep it
            </Button>
            <Button type="submit" variant="destructive">
              {verb} meeting
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
