'use client'

import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { GOOGLE_CONNECT_SCOPES } from '@/lib/google-scopes'

/** Asks Google for Calendar and Gmail access (signing in only asks for identity). Returns to `callbackUrl` afterwards. */
export function connectGoogle(callbackUrl: string): void {
  void signIn('google', { callbackUrl }, { scope: GOOGLE_CONNECT_SCOPES, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' })
}

export function ConnectGoogleButton({ callbackUrl, label = 'Connect Google' }: { callbackUrl: string; label?: string }): React.ReactElement {
  return (
    <Button size="sm" onClick={() => connectGoogle(callbackUrl)}>
      {label}
    </Button>
  )
}

/** What people see on Google's first screen, so it doesn't look like a problem. */
export function UnverifiedAppHint(): React.ReactElement {
  return (
    <span className="mt-0.5 block text-xs text-muted-foreground">
      Google will first say &ldquo;Google hasn&apos;t verified this app&rdquo;. That&apos;s expected for our in-house app: click <strong>Advanced</strong> →{' '}
      <strong>Go to igani (unsafe)</strong> → <strong>Allow</strong>, and keep every box ticked.
    </span>
  )
}
