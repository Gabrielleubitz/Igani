'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveSettings } from '@/app/actions/admin'
import type { SitePage } from '@/lib/site-pages'

/** Switch visitor analytics on or off for one website page (the site keeps sending; the CRM just stops recording). */
export function WebsiteTrackingToggle({ page, initial }: { page: SitePage; initial: Record<SitePage, boolean> }): React.ReactElement {
  const router = useRouter()
  const [on, setOn] = useState(initial[page])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={on}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked
          setOn(next)
          setError(null)
          start(async () => {
            const res = await saveSettings({ 'website.tracking': { ...initial, [page]: next } })
            if (!res.ok) {
              setOn(!next)
              setError(res.error)
            } else router.refresh()
          })
        }}
      />
      <span>{on ? 'Recording visits' : 'Recording is off'}</span>
      {error ? <span className="text-xs text-rose-400">{error}</span> : null}
    </label>
  )
}
