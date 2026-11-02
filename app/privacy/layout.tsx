import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo/meta'

export const metadata: Metadata = pageMeta({
  title: 'Privacy Policy | IGANI',
  description: 'How IGANI collects, uses and protects your personal information.',
  path: '/privacy',
})

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
