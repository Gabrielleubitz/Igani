'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { syncMyEmail } from '@/app/sales/actions'

/** Checks the signed-in user's Gmail in the background (throttled server-side) and refreshes if new emails arrived. */
export function MailSyncTrigger(): null {
  const router = useRouter()
  useEffect(() => {
    let alive = true
    void syncMyEmail().then((r) => {
      if (alive && r.ok && r.data.stored > 0) router.refresh()
    })
    return () => {
      alive = false
    }
  }, [router])
  return null
}
