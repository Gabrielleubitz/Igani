import { LeadsDirectory } from '@/components/crm/LeadsDirectory'
import { requireUser } from '@/lib/auth'

export const metadata = { title: 'Leads' }
export const dynamic = 'force-dynamic'

export default async function ContactsPage(
  props: { searchParams: Promise<Record<string, string | string[] | undefined>> }
): Promise<React.ReactElement> {
  const searchParams = await props.searchParams;
  const user = await requireUser()
  return LeadsDirectory({ searchParams, basePath: '/sales/leads', user })
}
