import type { Metadata } from 'next'
import { NewHome } from '@/app/components/home/NewHome'

// Work-in-progress home page, shared for review before it replaces "/"
export const metadata: Metadata = {
  title: 'Home preview | IGANI',
  robots: { index: false, follow: false },
}

export default function HomePreviewPage() {
  return <NewHome showSamples />
}
