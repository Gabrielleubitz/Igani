import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { FounderPersonJsonLd } from '@/components/FounderPersonJsonLd'
import {
  founderProfileUrl,
  founderSlug,
  getFounderBySlug,
  getFounderProfiles,
} from '@/lib/seo/founders'
import { SITE_NAME, SITE_URL } from '@/lib/seo/site'

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
      ...(founder.imageUrl ? { images: [{ url: founder.imageUrl }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(founder.imageUrl ? { images: [founder.imageUrl] } : {}),
    },
  }
}

export default async function FounderProfilePage({ params }: PageProps) {
  const founder = await getFounderBySlug(params.slug)
  if (!founder) notFound()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <FounderPersonJsonLd slug={params.slug} />
      <Header showBackButton backButtonText="About IGANI" backButtonHref="/about" />

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-32 sm:px-6">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-[#80A0E0]">
          {SITE_NAME} · Co-Founder
        </p>

        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {founder.name}
        </h1>
        <p className="mt-3 text-lg font-medium text-[#4080E0]">{founder.position}</p>

        {founder.imageUrl && (
          <div className="mt-10 overflow-hidden rounded-2xl border border-[#4080E0]/20">
            <img
              src={founder.imageUrl}
              alt={founder.name}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        )}

        <article className="mt-10 space-y-4 text-lg leading-relaxed text-white/80">
          <p>{founder.bio}</p>
          <p>
            {founder.name} is part of the leadership team at{' '}
            <Link href="/" className="text-[#80A0E0] underline-offset-4 hover:underline">
              {SITE_NAME}
            </Link>
            , a product studio building websites, apps, SaaS, and automations for startups and
            businesses.
          </p>
        </article>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/about"
            className="inline-flex items-center rounded-full border border-[#4080E0]/40 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-[#4080E0]/80 hover:bg-[#4080E0]/10"
          >
            Meet the full team
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-full bg-[#4080E0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5090F0]"
          >
            Work with {SITE_NAME}
          </Link>
          {founder.linkedinUrl && (
            <a
              href={founder.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer me"
              className="inline-flex items-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
            >
              LinkedIn
            </a>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
