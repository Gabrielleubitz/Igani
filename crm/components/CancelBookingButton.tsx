'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { approveBooking, cancelBooking } from '@/app/actions/bookings'
import { Button } from '@/components/ui/button'

export function BookingActions({ bookingId, canApprove }: { bookingId: string; canApprove: boolean }): React.ReactElement {
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
    <div className="flex items-center gap-2">
      {canApprove ? (
        <Button size="sm" disabled={pending} onClick={() => run(() => approveBooking(bookingId))}>
          Approve
        </Button>
      ) : null}
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => cancelBooking(bookingId))}>
        {canApprove ? 'Decline' : 'Cancel'}
      </Button>
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  )
}
