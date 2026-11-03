import { getAboutUsSettings } from '@/lib/firestore'
import {
  buildFounderKeywords,
  founderProfileUrl,
  getFounderProfiles,
} from '@/lib/seo/founders'
import { SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo/site'

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

  // The Organization itself is defined once, site-wide (SiteJsonLd, same @id); this page only references it.
  const graph = [
    {
      '@type': 'AboutPage',
      '@id': `${aboutUrl}#webpage`,
      url: aboutUrl,
      name: settings?.pageTitle || `About ${SITE_NAME}`,
      description,
      isPartOf: { '@id': orgId },
      mainEntity: { '@id': orgId },
      about: founders.map((f) => ({ '@id': `${founderProfileUrl(f.name)}#person` })),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'About', item: aboutUrl },
      ],
    },
    ...founders.map((f) => ({
      '@type': 'Person',
      '@id': `${founderProfileUrl(f.name)}#person`,
      name: f.name,
      jobTitle: f.position,
      description: f.bio,
      url: founderProfileUrl(f.name),
      ...(f.imageUrl ? { image: absoluteUrl(f.imageUrl) } : {}),
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
