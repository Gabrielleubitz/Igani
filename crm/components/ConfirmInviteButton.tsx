'use client'

import { useState, useTransition } from 'react'
import { confirmInvite } from '@/app/actions/bookings'
import { Button } from '@/components/ui/button'

export function ConfirmInviteButton({ token }: { token: string }): React.ReactElement {
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [meetUrl, setMeetUrl] = useState<string | null | undefined>(undefined)

  if (meetUrl !== undefined) {
    return (
      <div className="space-y-3">
        <p className="text-sm">Confirmed! A confirmation email with a calendar file is on its way.</p>
        {meetUrl ? (
          <Button asChild>
            <a href={meetUrl}>Join Google Meet</a>
          </Button>
        ) : null}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <Button
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await confirmInvite(token)
            if (res.ok) setMeetUrl(res.data.meetUrl)
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
