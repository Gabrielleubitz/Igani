import type { MetadataRoute } from 'next'
import { getFounderProfiles, founderProfileUrl } from '@/lib/seo/founders'
import { SITE_URL } from '@/lib/seo/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()
  const founders = await getFounderProfiles()

  const founderPages = founders.map((f) => ({
    url: founderProfileUrl(f.name),
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }))

  return [
    { url: SITE_URL, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/about`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    ...founderPages,
    { url: `${SITE_URL}/contact`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/packages`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
  ]
}
