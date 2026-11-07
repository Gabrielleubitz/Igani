import { CompanyDetailsCard } from '@/components/admin/CompanyDetailsCard'
import { SalesContractForm } from '@/components/admin/SalesContractForm'
import { PageIntro } from '@/components/PageIntro'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'

export const metadata = { title: 'Sales contracts' }
export const dynamic = 'force-dynamic'

/** Salesman commission agreements: fill in the figures, pick which admin signs, copy the link. */
export default async function SalesContractsPage(): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN'])
  const company = await getSetting('contract.company')
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, email: true, contractSigner: { select: { name: true, title: true, signature: true } } } })
  const signers = admins.map((a) => ({ userId: a.id, name: a.contractSigner?.name || a.name || a.email || 'Admin', title: a.contractSigner?.title ?? '', signature: a.contractSigner?.signature ?? '' }))
  return (
    <div className="space-y-5">
      <PageIntro title="Sales contracts" hint="One fixed commission agreement. Enter the salesman, their address and the figures, pick which admin signs for the company, and send the link. The company details are saved once below. The signed PDF is emailed to you and to the salesman, and a copy is kept in the system." />
      <CompanyDetailsCard company={company} />
      <SalesContractForm signers={signers} meId={user.id} adminEmail={user.email} company={company} />
    </div>
  )
}
