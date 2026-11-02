import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo/meta'

export const metadata: Metadata = pageMeta({
  title: 'Terms of Service | IGANI',
  description: 'The terms that apply when you use the IGANI website and our services.',
  path: '/terms',
})

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
