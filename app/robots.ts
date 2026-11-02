import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/site'

// Never crawled: the admin area, the API, and customer/checkout pages.
const DISALLOW = ['/admin/', '/api/', '/checkout', '/orders/', '/preview/']

// Search engines and AI assistants we want to be able to read and cite the public site. They are listed explicitly so the
// intent is on record. (A crawler that matches its own group ignores the '*' group, so each repeats the disallow list.)
const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: '/', disallow: DISALLOW })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
