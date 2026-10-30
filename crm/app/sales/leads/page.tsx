import { CrmSubNav } from '@/components/crm/CrmSubNav'
import { LeadsDirectory } from '@/components/crm/LeadsDirectory'
import { requireUser } from '@/lib/auth'

export const metadata = { title: 'Contacts' }

export default async function ContactsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): Promise<React.ReactElement> {
  const user = await requireUser()
  return (
    <div>
      <CrmSubNav active="/sales/leads" />
      {await LeadsDirectory({ searchParams, basePath: '/sales/leads', isAdmin: user.role === 'ADMIN' })}
    </div>
  )
}
