/** Main-website pages the CRM tracks (Admin → Website). The key is what the site's tracker sends. */
export const SITE_PAGES = {
  home: { label: 'Home page', path: '/' },
  realestate: { label: 'Real estate', path: '/realestate' },
} as const
export type SitePage = keyof typeof SITE_PAGES
export const isSitePage = (p: string): p is SitePage => Object.prototype.hasOwnProperty.call(SITE_PAGES, p)

/** The main website, and the only origins its tracker may post from. */
const dev = process.env.NODE_ENV === 'development'
// www: igani.co redirects there, and the heatmap's postMessage must target the origin the frame really ends up on
export const SITE_URL = dev ? (process.env.SITE_DEV_URL ?? 'http://localhost:3000') : 'https://www.igani.co'
const PROD_ORIGINS = ['https://igani.co', 'https://www.igani.co', 'https://funnels.igani.co']
/** Production: only igani.co. Local development: the site on any localhost port too. */
export const isSiteOrigin = (origin: string): boolean => PROD_ORIGINS.includes(origin) || (dev && /^http:\/\/localhost:\d+$/.test(origin))

/** The names the pages use in their own section menus. */
const NAMES: Record<string, string> = {
  page: 'Top & other',
  hero: 'Opening screen',
  'sheet-reason': 'First impression',
  'sheet-proof': 'The proof',
  'sheet-work': 'Our work',
  'sheet-tour': '3D tours',
  'sheet-build-what': 'What we build',
  'sheet-build': 'The bottom line',
  'sheet-why': 'Why it matters',
  'sheet-team': 'Our team',
  'sheet-process': 'The process',
  'sheet-contact': 'Get in touch',
}

/** A section id as a name: known ones from the pages' menus, others tidied ("build-what" → "Build what"). */
export function siteSectionLabel(id: string): string {
  if (NAMES[id]) return NAMES[id]
  const s = id.replace(/^sheet-/, '').replace(/-/g, ' ')
  return s.charAt(0).toUpperCase() + s.slice(1)
}
