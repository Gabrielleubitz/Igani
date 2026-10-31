import { LeadsDirectory } from '@/components/crm/LeadsDirectory'
import { requireUser } from '@/lib/auth'

export const metadata = { title: 'Contacts' }
export const dynamic = 'force-dynamic'

export default async function ContactsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): Promise<React.ReactElement> {
  const user = await requireUser()
  return LeadsDirectory({ searchParams, basePath: '/sales/leads', user })
}
