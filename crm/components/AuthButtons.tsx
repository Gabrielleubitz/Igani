'use client'

import { LogOut } from 'lucide-react'
import { signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function SignInButton({ callbackUrl }: { callbackUrl: string }): React.ReactElement {
  return (
    <Button size="lg" className="w-full" onClick={() => void signIn('google', { callbackUrl })}>
      Continue with Google
    </Button>
  )
}

/** `compact`: just the icon (the profile footer, next to the theme switch). */
export function SignOutButton({ compact = false }: { compact?: boolean }): React.ReactElement {
  if (compact)
    return (
      <Button variant="ghost" size="sm" aria-label="Sign out" title="Sign out" className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-foreground" onClick={() => void signOut({ callbackUrl: '/login' })}>
        <LogOut className="h-4 w-4" aria-hidden />
      </Button>
    )
  return (
    <Button variant="ghost" size="sm" onClick={() => void signOut({ callbackUrl: '/login' })}>
      Sign out
    </Button>
  )
}
