'use client'

import { Lock } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ACK_TEXT } from '@/lib/video-ack-core'

/**
 * Covers an internal training video with a confidentiality notice. The video is not even loaded until the person clicks
 * to confirm; the click is saved on the server (who, which video, when), and the server also refuses the video without it.
 * With enabled=false (admins, customer-facing videos) it just shows the video.
 */
export function ConfidentialityGate({ videoId, enabled, children }: { videoId: string; enabled: boolean; children: React.ReactNode }): React.ReactElement {
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!enabled || confirmed) return <>{children}</>

  async function confirm(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/videos/${videoId}/ack`, { method: 'POST' })
      if (res.ok) setConfirmed(true)
      else setError('We could not save your confirmation. Please try again.')
    } catch {
      setError('We could not save your confirmation. Please check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div role="dialog" aria-modal="false" aria-labelledby={`ack-${videoId}`} className="flex aspect-video w-full flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center text-white">
      <Lock className="h-8 w-8 text-amber-400" aria-hidden />
      <h3 id={`ack-${videoId}`} className="text-lg font-semibold">
        {ACK_TEXT.title}
      </h3>
      <p className="max-w-md text-sm leading-relaxed text-slate-200">{ACK_TEXT.body}</p>
      <Button onClick={() => void confirm()} disabled={busy}>
        {busy ? 'Saving…' : ACK_TEXT.button}
      </Button>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
