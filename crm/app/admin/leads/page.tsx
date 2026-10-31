import { LeadsDirectory } from '@/components/crm/LeadsDirectory'

export const metadata = { title: 'Contacts' }

export default function AdminLeadsPage({ searchParams }: { searchParams: Record<string, string | string[] | undefined> }): Promise<React.ReactElement> {
  return LeadsDirectory({ searchParams, basePath: '/admin/leads', isAdmin: true })
}
