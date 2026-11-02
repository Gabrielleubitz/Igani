import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo/site'

// Never crawled: the API and customer/checkout pages. The admin area is deliberately NOT listed here: robots.txt is public,
// so naming it would advertise it. Admin pages are kept out of search by a noindex tag instead.
const DISALLOW = ['/api/', '/checkout', '/orders/', '/preview/']

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
