import { getFounderProfiles, founderProfileUrl, founderSlug } from '@/lib/seo/founders'
import { SITE_NAME, SITE_URL } from '@/lib/seo/site'
import { AMITAY_PHONE, DEFAULT_TIKTOK_URL, GABRIEL_PHONE, INSTAGRAM_URL, formatPhone } from '@/lib/siteSocial'

const tel = (n: string): string => `+${formatPhone(n).replace(/\D/g, '')}`

export async function SiteJsonLd() {
  const founders = await getFounderProfiles()
  const orgId = `${SITE_URL}/#organization`

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': ['Organization', 'ProfessionalService'],
        '@id': orgId,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/igani-logo.png`,
        description: 'IGANI designs and builds websites and software solutions that help companies grow and operate more effectively, with a focus on service businesses and real estate professionals.',
        email: 'info@igani.co',
        address: { '@type': 'PostalAddress', addressLocality: 'Netanya', addressCountry: 'IL' },
        areaServed: 'IL',
        knowsAbout: ['Website design', 'Website development', 'Real estate agent websites', 'Landing pages'],
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'IGANI services',
          itemListElement: [
            'Websites for real estate agents and brokerages',
            'Brand-led websites for service businesses',
            'Landing pages',
          ].map((name) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name } })),
        },
        contactPoint: [
          { '@type': 'ContactPoint', name: 'Gabriel', telephone: tel(GABRIEL_PHONE), email: 'info@igani.co', contactType: 'sales' },
          { '@type': 'ContactPoint', name: 'Amitay', telephone: tel(AMITAY_PHONE), email: 'info@igani.co', contactType: 'sales' },
        ],
        sameAs: [INSTAGRAM_URL, DEFAULT_TIKTOK_URL],
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
