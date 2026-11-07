import type { MetadataRoute } from 'next'

/** The CRM, proposals and call links are private: nothing here should be crawled. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } }
}
