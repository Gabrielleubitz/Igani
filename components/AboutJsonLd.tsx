import { getAboutUsSettings } from '@/lib/firestore'
import {
  buildFounderKeywords,
  founderSlug,
  getFounderProfiles,
} from '@/lib/seo/founders'
import { SITE_NAME, SITE_URL } from '@/lib/seo/site'

export async function AboutJsonLd() {
  const [settings, founders] = await Promise.all([
    getAboutUsSettings(),
    getFounderProfiles(),
  ])

  const aboutUrl = `${SITE_URL}/about`
  const orgId = `${SITE_URL}/#organization`
  const founderNames = founders.map((f) => f.name).join(', ')
  const pageDescription =
    settings?.metaDescription ||
    `Learn about ${SITE_NAME} — web development, design, and SaaS product studio.`

  const description = founderNames
    ? `${pageDescription} Meet the ${SITE_NAME} co-founders: ${founderNames}.`
    : pageDescription

  const graph = [
    {
      '@type': 'Organization',
      '@id': orgId,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/igani-logo.png`,
      description: pageDescription,
      founder: founders.map((f) => ({ '@id': `${aboutUrl}#${founderSlug(f.name)}` })),
    },
    {
      '@type': 'AboutPage',
      '@id': `${aboutUrl}#webpage`,
      url: aboutUrl,
      name: settings?.pageTitle || `About ${SITE_NAME}`,
      description,
      isPartOf: { '@id': orgId },
      mainEntity: { '@id': orgId },
      about: founders.map((f) => ({ '@id': `${aboutUrl}#${founderSlug(f.name)}` })),
    },
    ...founders.map((f) => ({
      '@type': 'Person',
      '@id': `${aboutUrl}#${founderSlug(f.name)}`,
      name: f.name,
      jobTitle: f.position,
      description: f.bio,
      url: aboutUrl,
      ...(f.imageUrl ? { image: f.imageUrl } : {}),
      worksFor: { '@id': orgId },
      ...(f.linkedinUrl ? { sameAs: [f.linkedinUrl] } : {}),
    })),
  ]

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
      }}
    />
  )
}
