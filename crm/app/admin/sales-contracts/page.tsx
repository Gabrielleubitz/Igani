import { SalesContractForm } from '@/components/admin/SalesContractForm'
import { PageIntro } from '@/components/PageIntro'
import { requireUser } from '@/lib/auth'
import { getSetting } from '@/lib/settings'

export const metadata = { title: 'Sales contracts' }
export const dynamic = 'force-dynamic'

/** Salesman commission agreements: fill in the figures, sign, copy the link. Nothing is saved on the site. */
export default async function SalesContractsPage(): Promise<React.ReactElement> {
  const user = await requireUser(['ADMIN'])
  const [signer, signature] = await Promise.all([getSetting('contract.signer'), getSetting('contract.signature')])
  return (
    <div className="space-y-5">
      <PageIntro title="Sales contracts" hint="One fixed commission agreement. Enter the salesman and the figures, sign, and send them the link. The signed PDF is emailed to you and to them; the agreement is kept for 12 hours or until it is signed, then deleted." />
      <SalesContractForm adminName={signer.name || user.name || user.email} adminEmail={user.email} signature={signature} />
    </div>
  )
}
