import type { Metadata } from 'next'
import { getAboutUsSettings } from '@/lib/firestore'
import { AboutJsonLd } from '@/components/AboutJsonLd'
import { buildFounderKeywords, getFounderProfiles } from '@/lib/seo/founders'
import { SITE_NAME, SITE_URL } from '@/lib/seo/site'

export async function generateMetadata(): Promise<Metadata> {
  const [settings, founders] = await Promise.all([
    getAboutUsSettings(),
    getFounderProfiles(),
  ])

  const founderNames = founders.map((f) => f.name).join(', ')
  const pageTitle = settings?.pageTitle || `About ${SITE_NAME}`
  const baseDescription =
    settings?.metaDescription ||
    `Learn about ${SITE_NAME} — a product studio for web development, design, and SaaS.`

  const description = founderNames
    ? `${baseDescription} Co-founders: ${founderNames}.`
    : baseDescription

  const keywords = buildFounderKeywords(founders).join(', ')

  return {
    title: `${pageTitle} | ${SITE_NAME}`,
    description,
    keywords,
    alternates: {
      canonical: `${SITE_URL}/about`,
    },
    openGraph: {
      title: `${pageTitle} — ${founderNames || SITE_NAME}`,
      description,
      url: `${SITE_URL}/about`,
      siteName: SITE_NAME,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pageTitle} — ${founderNames || SITE_NAME}`,
      description,
    },
  }
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AboutJsonLd />
      {children}
    </>
  )
}
