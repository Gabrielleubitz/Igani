import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from '@/lib/seo/site'
import StartPageClient from './StartPageClient'

export const metadata: Metadata = {
  title: `Start a project | ${SITE_NAME}`,
  description: 'Start a project with IGANI — message us on WhatsApp or leave your details and we’ll get back to you.',
  alternates: { canonical: `${SITE_URL}/start` },
}

export default function StartPage() {
  return <StartPageClient />
}
