'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** Dev/QA-only sign-in for whitelisted emails. Rendered only when DEV_LOGIN=1 outside production. */
export function DevLogin({ callbackUrl }: { callbackUrl: string }): React.ReactElement {
  const [email, setEmail] = useState('')
  return (
    <form
      className="mt-4 space-y-2 border-t pt-4"
      onSubmit={(e) => {
        e.preventDefault()
        void signIn('credentials', { email, callbackUrl })
      }}
    >
      <p className="text-xs text-muted-foreground">Dev login (whitelisted email)</p>
      <Input aria-label="Dev login email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button type="submit" variant="outline" className="w-full">
        Dev sign in
      </Button>
    </form>
  )
}
