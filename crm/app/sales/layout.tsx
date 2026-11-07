import Link from 'next/link'
import type { ReactNode } from 'react'
import { AppShell } from '@/components/AppShell'
import { needsNewAgreement } from '@/lib/agreement-status'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Layout({ children }: { children: ReactNode }): Promise<React.ReactElement> {
  const user = await requireUser()
  const resign = user.role === 'SALES' ? await needsNewAgreement(user.email).catch(() => false) : false
  return (
    <AppShell user={user}>
      {resign ? (
        <div role="status" className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <strong>Your commission agreement needs signing.</strong> We updated it. Your admin will send you a link to sign the new one. Once signed, you will find the signed copy under <Link href="/sales/documents" className="underline">Documents</Link>.
        </div>
      ) : null}
      {children}
    </AppShell>
  )
}
