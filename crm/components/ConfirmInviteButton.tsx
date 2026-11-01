'use client'

import { useState, useTransition } from 'react'
import { confirmInvite } from '@/app/actions/bookings'
import { Button } from '@/components/ui/button'

/** Shown once the guest accepts: no Meet link here, it arrives by email with the meeting details. */
export function ApprovedNotice(): React.ReactElement {
  return (
    <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4" role="status">
      <p className="text-lg font-semibold text-emerald-300">✓ Approved!</p>
      <p className="text-sm text-muted-foreground">You&apos;ll receive an email with the meeting details and the call link shortly. Check your spam folder if you don&apos;t see it.</p>
    </div>
  )
}

export function ConfirmInviteButton({ token }: { token: string }): React.ReactElement {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [approved, setApproved] = useState(false)

  if (approved) return <ApprovedNotice />
  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await confirmInvite(token)
            if (res.ok) setApproved(true)
            else setError(res.error)
          })
        }
      >
        {pending ? 'Confirming…' : 'Confirm this time'}
      </Button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
