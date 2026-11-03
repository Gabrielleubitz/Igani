import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { OfferPage } from '@/components/offer/OfferPage'
import { t } from '@/components/offer/i18n'
import { offerBase, pickLang } from '@/lib/offer-request'
import { loadPublicOffer } from '@/lib/offers'
import { getSetting } from '@/lib/settings'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const data = await loadPublicOffer(params.slug)
  if (!data) return { title: 'Not found', robots: { index: false, follow: false } }
  const lang = pickLang(searchParams.lang, data.definition?.content.defaultLang)
  const title = data.definition ? t(data.definition.content.hero.title, lang) : data.offer.title
  // Offers are private links: never indexed, and the CRM title template doesn't apply
  return { title: { absolute: `${title} · Igani` }, robots: { index: false, follow: false } }
}

export default async function Page(props: Props): Promise<React.ReactElement> {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const data = await loadPublicOffer(params.slug)
  if (!data) notFound()
  const lang = pickLang(searchParams.lang, data.definition?.content.defaultLang)
  return <OfferPage data={data} lang={lang} base={await offerBase(params.slug)} supportEmail={await getSetting('brand.supportEmail')} />
}
