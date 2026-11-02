import type { Metadata } from 'next'
import { NOINDEX } from '@/lib/seo/meta'

// Kept out of search results; visitors and ads are not affected.
export const metadata: Metadata = NOINDEX

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return children
}
