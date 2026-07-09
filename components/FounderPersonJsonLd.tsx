import {
  founderProfileUrl,
  getFounderBySlug,
} from '@/lib/seo/founders'
import { SITE_NAME, SITE_URL } from '@/lib/seo/site'

type FounderPersonJsonLdProps = {
  slug: string
}

export async function FounderPersonJsonLd({ slug }: FounderPersonJsonLdProps) {
  const founder = await getFounderBySlug(slug)
  if (!founder) return null

  const profileUrl = founderProfileUrl(founder.name)
  const orgId = `${SITE_URL}/#organization`

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${profileUrl}#person`,
        name: founder.name,
        jobTitle: founder.position,
        description: founder.bio,
        url: profileUrl,
        ...(founder.imageUrl ? { image: founder.imageUrl } : {}),
        worksFor: { '@id': orgId },
        ...(founder.linkedinUrl ? { sameAs: [founder.linkedinUrl] } : {}),
      },
      {
        '@type': 'ProfilePage',
        '@id': `${profileUrl}#webpage`,
        url: profileUrl,
        name: `${founder.name} | ${SITE_NAME}`,
        description: founder.bio,
        mainEntity: { '@id': `${profileUrl}#person` },
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
