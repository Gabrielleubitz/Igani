import Link from 'next/link'
import { LeadImport } from '@/components/crm/LeadImport'
import { requireUser } from '@/lib/auth'

export const metadata = { title: 'Import leads' }

export default async function ImportPage(): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  return (
    <div className="space-y-4">
      <Link href="/sales" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Pipeline
      </Link>
      <h1 className="text-2xl font-semibold">Import leads from CSV</h1>
      <LeadImport />
    </div>
  )
}
