import type { MetadataRoute } from 'next'
import { getFounderProfiles, founderProfileUrl } from '@/lib/seo/founders'
import { SITE_URL } from '@/lib/seo/site'

// Real "last changed" dates (not "now" on every request, which makes crawlers ignore the field). Update when a page's content changes.
const CHANGED = {
  home: new Date('2026-11-02'),
  about: new Date('2026-11-02'),
  legal: new Date('2026-10-30'),
  faq: new Date('2026-11-03'),
  realestate: new Date('2026-11-03'),
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const founders = await getFounderProfiles()

  const founderPages = founders.map((f) => ({
    url: founderProfileUrl(f.name),
    lastModified: CHANGED.about,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }))

  return [
    { url: SITE_URL, lastModified: CHANGED.home, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/about`, lastModified: CHANGED.about, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/realestate`, lastModified: CHANGED.realestate, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/faq`, lastModified: CHANGED.faq, changeFrequency: 'monthly', priority: 0.8 },
    ...founderPages,
    { url: `${SITE_URL}/privacy`, lastModified: CHANGED.legal, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: CHANGED.legal, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
