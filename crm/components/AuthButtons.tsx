'use client'

import { signIn, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function SignInButton({ callbackUrl }: { callbackUrl: string }): React.ReactElement {
  return (
    <Button size="lg" className="w-full" onClick={() => void signIn('google', { callbackUrl })}>
      Continue with Google
    </Button>
  )
}

export function SignOutButton(): React.ReactElement {
  return (
    <Button variant="ghost" size="sm" onClick={() => void signOut({ callbackUrl: '/login' })}>
      Sign out
    </Button>
  )
}
