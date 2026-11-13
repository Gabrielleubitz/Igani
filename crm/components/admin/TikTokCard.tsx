'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SocialTestPost } from '@/components/admin/SocialTestPost'
import type { TikTokStatus } from '@/lib/tiktok'

const MESSAGES: Record<string, string> = {
  connected: 'TikTok connected.',
  declined: 'You cancelled on TikTok. Nothing changed.',
  expired: 'That sign-in link expired. Try again.',
  failed: 'TikTok sign-in failed. Try again, and check the client key and secret in Vercel.',
  forbidden: 'Only admins can connect TikTok.',
  'not-configured': 'TikTok is not configured yet: add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in Vercel.',
}

/** Admin → Settings: connect or disconnect Igani's own TikTok account (used by the reel job to upload videos). */
export function TikTokCard({ status, configured, message }: { status: TikTokStatus; configured: boolean; message: string | null }): React.ReactElement {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const note = message ? MESSAGES[message] ?? null : null
  async function disconnect(): Promise<void> {
    setBusy(true)
    await fetch('/api/admin/tiktok/disconnect', { method: 'POST' })
    setBusy(false)
    router.refresh()
  }
  return (
    <div className="space-y-3 text-sm">
      {note && <p className="rounded-md bg-muted px-3 py-2">{note}</p>}
      {!configured ? (
        <p className="text-muted-foreground">Not configured. Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in Vercel (the Sandbox ones while the app is in review), then redeploy.</p>
      ) : status.connected ? (
        <div className="flex flex-wrap items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- TikTok's avatar host, shown once on an admin page */}
          {status.avatarUrl && <img src={status.avatarUrl} alt="" className="h-9 w-9 rounded-full" />}
          <div className="min-w-0 flex-1">
            <p className="font-medium">Connected{status.displayName ? ` as ${status.displayName}` : ''}</p>
            <p className="text-muted-foreground">Permissions: {status.scope.split(',').join(', ')} · sign-in renews itself; reconnect within {status.daysLeft} days at the latest</p>
          </div>
          <SocialTestPost platform="tiktok" />
          <Button variant="outline" size="sm" disabled={busy} onClick={disconnect}>Disconnect</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-muted-foreground">Not connected. The reel job can’t upload until an admin connects Igani’s TikTok account.</p>
          <Button asChild size="sm"><a href="/api/admin/tiktok/connect">Connect TikTok</a></Button>
        </div>
      )}
    </div>
  )
}
