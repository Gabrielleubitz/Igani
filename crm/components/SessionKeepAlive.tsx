'use client'

import { useEffect } from 'react'

/**
 * Re-reads the session every 10 minutes (and when the tab regains focus). The session endpoint runs the JWT callback,
 * which re-checks the team list and rolls the 7-day expiry, so role changes apply without signing out and active
 * teammates aren't logged out a week after signing in.
 */
export function SessionKeepAlive(): null {
  useEffect(() => {
    const ping = (): void => void fetch('/api/auth/session', { cache: 'no-store' }).catch(() => undefined)
    ping()
    const t = setInterval(ping, 10 * 60_000)
    const onFocus = (): void => {
      if (document.visibilityState === 'visible') ping()
    }
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])
  return null
}
