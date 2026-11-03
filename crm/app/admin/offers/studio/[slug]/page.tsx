import Link from 'next/link'
import { notFound } from 'next/navigation'
import { StudioConnect } from '@/components/admin/StudioConnect'
import { PageIntro } from '@/components/PageIntro'
import { requireUser } from '@/lib/auth'
import { slugProblem } from '@/lib/offer-modules'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Offer studio' }
export const dynamic = 'force-dynamic'

/**
 * Claude + live preview for one offer, inside the CRM (like Lovable / Bolt). The terminal and the preview run on the
 * admin's Mac through the studio helper; this page just connects to them (see components/admin/StudioConnect).
 */
export default async function StudioPage({ params }: { params: { slug: string } }): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const slug = params.slug
  if (slugProblem(slug)) notFound()
  const offer = await prisma.offer.findUnique({ where: { slug }, select: { id: true, title: true } })
  if (!offer) notFound()
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageIntro title={`Studio · ${offer.title}`} hint='Click into the terminal and tell Claude what to build. The preview updates as it works. Say "push" when it is ready to go live.' />
        <Link href={`/admin/offers/${offer.id}`} className="text-sm text-muted-foreground hover:text-foreground">
          Numbers and contract →
        </Link>
      </div>
      <StudioConnect slug={slug} />
    </div>
  )
}
