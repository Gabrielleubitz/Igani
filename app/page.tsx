import type { Metadata, ResolvingMetadata } from 'next'
import { NewHome } from '@/app/components/home/NewHome'

// Title and description come from the admin Site Settings (root layout); this only adds the home page's own canonical and og:url.
export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const p = await parent
  return {
    alternates: { canonical: '/' },
    openGraph: { ...p.openGraph, url: '/' },
  }
}

export default function HomePage() {
  return <NewHome />
}
