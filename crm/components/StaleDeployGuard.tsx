'use client'

import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { isBusy, isStaleDeployError } from '@/lib/stale-deploy'

const KEY = 'igani.staleReloadAt'

/**
 * Catches "this tab is from an older version" errors anywhere on the page. If nobody is looking (tab in the background)
 * and nothing is in progress, the page quietly reloads; otherwise a small bar offers a reload. Never loops: at most one
 * automatic reload every 5 minutes.
 */
export function StaleDeployGuard(): React.ReactElement | null {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onStale = (): void => {
      let last = 0
      try {
        last = Number(sessionStorage.getItem(KEY) ?? 0)
      } catch {
        /* no storage */
      }
      const canAuto = document.visibilityState === 'hidden' && !isBusy() && Date.now() - last > 5 * 60_000
      if (canAuto) {
        try {
          sessionStorage.setItem(KEY, String(Date.now()))
        } catch {
          /* no storage */
        }
        window.location.reload()
      } else setShow(true)
    }
    const onRejection = (e: PromiseRejectionEvent): void => {
      if (!isStaleDeployError(e.reason)) return
      e.preventDefault()
      onStale()
    }
    const onError = (e: ErrorEvent): void => {
      if (isStaleDeployError(e.error ?? e.message)) onStale()
    }
    window.addEventListener('unhandledrejection', onRejection)
    window.addEventListener('error', onError)
    window.addEventListener('igani:stale', onStale)
    return () => {
      window.removeEventListener('unhandledrejection', onRejection)
      window.removeEventListener('error', onError)
      window.removeEventListener('igani:stale', onStale)
    }
  }, [])
  if (!show) return null
  return (
    <div role="status" className="fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-background/95 px-4 py-2.5 text-sm shadow-2xl backdrop-blur">
        <span>Igani was updated. Reload to get the latest version.</span>
        <button type="button" onClick={() => (isBusy() ? setShow(false) : window.location.reload())} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110">
          <RefreshCw className="h-3.5 w-3.5" /> {isBusy() ? 'After your call' : 'Reload'}
        </button>
      </div>
    </div>
  )
}
