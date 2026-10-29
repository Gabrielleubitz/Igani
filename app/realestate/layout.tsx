import type { Metadata } from 'next'

const TITLE = 'IGANI | Websites for Real Estate Agents'
const DESCRIPTION =
  'Buyers Google you before they call you. Websites that win the listing: home valuation and showing-request forms that send leads to your CRM, Matterport 3D tours, and a brand that’s yours.'

// The social tags are set here too: without them Facebook and X show the main site's title and description
export const metadata: Metadata = {
  metadataBase: new URL('https://funnels.igani.co'),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/realestate',
    siteName: 'IGANI',
    type: 'website',
    images: [{ url: '/og/realestate.jpg', width: 1200, height: 630, alt: 'Buyers Google you before they call you. Websites for real estate agents by IGANI' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og/realestate.jpg'],
  },
}

export default function RealEstateLayout({ children }: { children: React.ReactNode }) {
  return children
}
