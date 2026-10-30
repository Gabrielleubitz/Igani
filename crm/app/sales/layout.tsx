import type { ReactNode } from 'react'
import { AppShell } from '@/components/AppShell'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Layout({ children }: { children: ReactNode }): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN', 'SALES'])
  return <AppShell user={user}>{children}</AppShell>
}
