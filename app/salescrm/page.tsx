import type { Metadata } from 'next'
import { SalesCrmLanding } from '@/app/components/salescrm/SalesCrmLanding'

const TITLE = 'Sales CRM with AI call review | Igani'
const DESCRIPTION = 'A CRM that records, transcribes and reviews every sales call, so every rep improves and every manager sees what is happening. Built into the website we build for your company.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/salescrm' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/salescrm', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
}

export default function SalesCrmPage() {
  return <SalesCrmLanding />
}
