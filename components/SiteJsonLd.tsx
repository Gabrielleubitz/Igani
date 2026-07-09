import { getFounderProfiles, founderProfileUrl, founderSlug } from '@/lib/seo/founders'
import { SITE_NAME, SITE_URL } from '@/lib/seo/site'

export async function SiteJsonLd() {
  const founders = await getFounderProfiles()
  const orgId = `${SITE_URL}/#organization`

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': orgId,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/igani-logo.png`,
        founder: founders.map((f) => ({ '@id': `${founderProfileUrl(f.name)}#person` })),
        employee: founders.map((f) => ({
          '@type': 'Person',
          '@id': `${founderProfileUrl(f.name)}#person`,
          name: f.name,
          url: founderProfileUrl(f.name),
        })),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { '@id': orgId },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  )
}
