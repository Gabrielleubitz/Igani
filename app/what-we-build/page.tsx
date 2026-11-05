import type { Metadata } from 'next'
import { WhatWeBuild } from '@/app/components/whatwebuild/WhatWeBuild'

const TITLE = 'What we build | Igani'
const DESCRIPTION = 'We build your website, and whatever your business needs behind it: CRMs, call review, booking, offers and contracts, and anything else. See examples of what we have built.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/what-we-build' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/what-we-build', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default function WhatWeBuildPage() {
  return <WhatWeBuild />
}
