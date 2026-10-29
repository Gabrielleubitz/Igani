import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IGANI | Websites for Real Estate Agents',
  description:
    'Websites for real estate agents and brokerages: IDX/MLS listings, home valuation and showing-request forms that send leads to your CRM, and a brand that wins the listing.',
}

export default function RealEstateLayout({ children }: { children: React.ReactNode }) {
  return children
}
