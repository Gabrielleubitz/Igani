import type { Metadata } from 'next'
import { pageMeta } from '@/lib/seo/meta'

export const metadata: Metadata = pageMeta({
  title: 'Questions about working with IGANI',
  description: 'How long a website takes, how pricing works, what is included for real estate agents, languages, the process and what happens after delivery.',
  path: '/faq',
})

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children
}
