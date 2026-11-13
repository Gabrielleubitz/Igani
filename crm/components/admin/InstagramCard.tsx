'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SocialTestPost } from '@/components/admin/SocialTestPost'
import type { InstagramStatus } from '@/lib/instagram'

const MESSAGES: Record<string, string> = {
  connected: 'Instagram connected.',
  declined: 'You cancelled on Instagram. Nothing changed.',
  expired: 'That sign-in link expired. Try again.',
  failed: 'Instagram sign-in failed. Check the app ID and secret in Vercel, and that the account is a professional account with access to the app.',
  forbidden: 'Only admins can connect Instagram.',
  'not-configured': 'Instagram is not configured yet: add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET in Vercel.',
}

/** Admin → Settings: connect Igani's Instagram (professional) account. Reels post only when an admin approves them. */
export function InstagramCard({ status, configured, message }: { status: InstagramStatus; configured: boolean; message: string | null }): React.ReactElement {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const note = message ? MESSAGES[message] ?? null : null
  async function disconnect(): Promise<void> {
    setBusy(true)
    await fetch('/api/admin/instagram/disconnect', { method: 'POST' })
    setBusy(false)
    router.refresh()
  }
  return (
    <div className="space-y-3 text-sm">
      {note && <p className="rounded-md bg-muted px-3 py-2">{note}</p>}
      {!configured ? (
        <p className="text-muted-foreground">Not configured. Add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET in Vercel, then redeploy.</p>
      ) : status.connected ? (
        <div className="flex flex-wrap items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- Instagram's avatar host, shown once on an admin page */}
          {status.picture && <img src={status.picture} alt="" className="h-9 w-9 rounded-full" />}
          <div className="min-w-0 flex-1">
            <p className="font-medium">Connected{status.username ? ` as @${status.username}` : ''}</p>
            <p className="text-muted-foreground">Renews itself when used; otherwise reconnect within {status.daysLeft} days</p>
          </div>
          <SocialTestPost platform="instagram" />
          <Button variant="outline" size="sm" disabled={busy} onClick={disconnect}>Disconnect</Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-muted-foreground">Not connected.</p>
          <Button asChild size="sm"><a href="/api/admin/instagram/connect">Connect Instagram</a></Button>
        </div>
      )}
    </div>
  )
}
