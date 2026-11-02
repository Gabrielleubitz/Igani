import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from './site'

/** Share image used when a page has none of its own (1200x630). */
export const DEFAULT_OG_IMAGE = { url: '/og/default.jpg', width: 1200, height: 630, alt: 'IGANI: websites for service businesses' }

/**
 * Metadata for a page that sets its own title/description. Next replaces a page's `openGraph` / `twitter` objects
 * wholesale (they are not merged with the root layout's), so everything a share card needs is spelled out here.
 */
export function pageMeta({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const url = `${SITE_URL}${path}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, type: 'website', images: [DEFAULT_OG_IMAGE] },
    twitter: { card: 'summary_large_image', title, description, images: [DEFAULT_OG_IMAGE.url] },
  }
}

/** Pages that must never appear in search results (customer, admin and checkout pages, A/B variants). Visitors are unaffected. */
export const NOINDEX: Metadata = { robots: { index: false, follow: false } }
