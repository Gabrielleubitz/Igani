import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ContractEditor } from '@/components/admin/ContractEditor'
import { requireUser } from '@/lib/auth'
import { parseContractDoc } from '@/lib/contract'
import { loadDefinition } from '@/lib/offers'
import { canSeeOffer } from '@/lib/offer-access'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'

export const metadata = { title: 'Contract' }
export const dynamic = 'force-dynamic'
// The AI draft takes up to a couple of minutes
export const maxDuration = 180

export default async function ContractPage(props: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  const params = await props.params;
  const user = await requireUser(['ADMIN'])
  const offer = await prisma.offer.findUnique({ where: { id: params.id }, select: { id: true, slug: true, title: true, contractDoc: true, contractLang: true, contractApprovedAt: true, signedAt: true, createdById: true, memberIds: true } })
  if (!offer || !canSeeOffer(user, offer)) notFound()
  const [signer, signature, def] = await Promise.all([getSetting('contract.signer'), getSetting('contract.signature'), loadDefinition(offer.slug)])
  const lang = offer.contractLang === 'en' || offer.contractLang === 'he' ? offer.contractLang : (def?.content.defaultLang ?? 'he')
  return (
    <div className="space-y-4">
      <div>
        <Link href={`/admin/offers/${offer.id}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← {offer.title}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Contract</h1>
        <p className="mt-1 text-sm text-muted-foreground">Drafted from Igani&apos;s standard terms and this offer. Edit it, check the preview, then approve: it&apos;s signed for Igani and the client signs it on the offer page.</p>
      </div>
      <ContractEditor offerId={offer.id} initial={parseContractDoc(offer.contractDoc)} initialLang={lang} approved={!!offer.contractApprovedAt} signed={!!offer.signedAt} signerReady={!!signer.name && !!signature} />
    </div>
  )
}
