import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { NewSiteShell } from '@/components/newsite/NewSiteShell'
import { FounderPersonJsonLd } from '@/components/FounderPersonJsonLd'
import {
  founderProfileUrl,
  founderSlug,
  getFounderBySlug,
  getFounderProfiles,
} from '@/lib/seo/founders'
import { SITE_NAME, SITE_URL } from '@/lib/seo/site'
import { DEFAULT_OG_IMAGE } from '@/lib/seo/meta'
import { CONTACT_HREF } from '@/lib/contactLink'

// Team bios are edited in the admin; rebuild these pages from Firestore every few minutes
export const revalidate = 300

type PageProps = {
  params: { slug: string }
}

export async function generateStaticParams() {
  const founders = await getFounderProfiles()
  return founders.map((f) => ({ slug: founderSlug(f.name) }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const founder = await getFounderBySlug(params.slug)
  if (!founder) return { title: `Team | ${SITE_NAME}` }

  const profileUrl = founderProfileUrl(founder.name)
  const title = `${founder.name} — ${founder.position} at ${SITE_NAME}`
  const description = `${founder.name} is ${founder.position} at ${SITE_NAME}. ${founder.bio}`

  return {
    title,
    description,
    keywords: [
      founder.name,
      `${founder.name} ${SITE_NAME}`,
      `${founder.name} Igani`,
      `${founder.name} IGANI`,
      SITE_NAME,
      'IGANI founders',
      founder.position,
    ].join(', '),
    alternates: { canonical: profileUrl },
    openGraph: {
      title,
      description,
      url: profileUrl,
      siteName: SITE_NAME,
      type: 'website',
      images: founder.imageUrl ? [{ url: founder.imageUrl }] : [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: founder.imageUrl ? [founder.imageUrl] : [DEFAULT_OG_IMAGE.url],
    },
  }
}

export default async function FounderProfilePage({ params }: PageProps) {
  const founder = await getFounderBySlug(params.slug)
  if (!founder) notFound()

  return (
    <NewSiteShell>
      <FounderPersonJsonLd slug={params.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
              { '@type': 'ListItem', position: 2, name: 'About', item: `${SITE_URL}/about` },
              { '@type': 'ListItem', position: 3, name: founder.name, item: founderProfileUrl(founder.name) },
            ],
          }),
        }}
      />
      <div className="fp">
        <p className="crumbs">
          <Link href="/">Home</Link> <span>/</span> <Link href="/about">About</Link> <span>/</span> {founder.name}
        </p>
        <div className="fp__top">
          {founder.imageUrl && <img src={founder.imageUrl} alt={founder.name} width={112} height={112} className="fp__ph" />}
          <div>
            <h1>{founder.name}</h1>
            <p className="fp__pos">{founder.position}</p>
          </div>
        </div>
        <article>
          <p>{founder.bio}</p>
          <p>
            {founder.name} is part of the leadership team at <Link href="/">{SITE_NAME}</Link>, a product studio building websites, apps, SaaS, and automations for startups and businesses.
          </p>
        </article>
        <div className="fp__links">
          <Link href="/about">Meet the full team</Link>
          <Link href={CONTACT_HREF}>Work with {SITE_NAME}</Link>
          {founder.linkedinUrl && (
            <a href={founder.linkedinUrl} target="_blank" rel="noopener noreferrer me">
              LinkedIn
            </a>
          )}
        </div>
      </div>
    </NewSiteShell>
  )
}
