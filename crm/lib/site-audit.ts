import 'server-only'
import { fetchRaw } from './site-scan'
import { analyzeSite, type SiteReport } from './site-audit-core'

let latestWp: { v: string; at: number } | null = null

/** Newest WordPress release, from wordpress.org (cached 12 h). null if it can't be read: then we do not judge the version. */
async function latestWordPress(): Promise<string | null> {
  if (latestWp && Date.now() - latestWp.at < 12 * 3600_000) return latestWp.v
  const r = await fetchRaw('https://api.wordpress.org/core/version-check/1.7/')
  try {
    const v = (JSON.parse(r?.body ?? '{}') as { offers?: { current?: string }[] }).offers?.[0]?.current
    if (v && /^\d+\.\d+(\.\d+)?$/.test(v)) {
      latestWp = { v, at: Date.now() }
      return v
    }
  } catch {
    /* ignore */
  }
  return null
}

/** Turn what a person typed into an address: adds https://, drops spaces; null if it is not a site address. */
export function normalizeSiteUrl(input: string): string | null {
  const t = input.trim()
  if (!t || /\s/.test(t)) return null
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`)
    return /\.[a-z]{2,}$/i.test(u.hostname) || /^\d+\.\d+\.\d+\.\d+$/.test(u.hostname) ? u.origin + (u.pathname === '/' ? '' : u.pathname) : null
  } catch {
    return null
  }
}

/** Reads the site like a visitor would and returns the report. null when the site can't be reached at all. */
export async function auditSite(rawUrl: string): Promise<SiteReport | null> {
  const url = normalizeSiteUrl(rawUrl)
  if (!url) return null
  let home = await fetchRaw(url)
  // some sites only answer on http; try it before giving up on a bare domain
  if ((!home || home.status >= 400 || !home.body) && /^https:/i.test(url) && !/\/.+/.test(new URL(url).pathname)) home = await fetchRaw(url.replace(/^https:/i, 'http:'))
  if (!home || !home.body) return null
  const base = new URL(home.url).origin
  const isWp = /\/wp-content\/|\/wp-includes\/|wp-json|name=["']generator["'][^>]+WordPress/i.test(home.body + (home.headers.link ?? ''))
  let wp: NonNullable<Parameters<typeof analyzeSite>[0]['wp']> | undefined
  if (isWp) {
    const [readme, xml, users, latest] = await Promise.all([fetchRaw(`${base}/readme.html`), fetchRaw(`${base}/xmlrpc.php`), fetchRaw(`${base}/wp-json/wp/v2/users?per_page=5`), latestWordPress()])
    let slugs: string[] = []
    try {
      const j = JSON.parse(users?.status === 200 ? users.body : '[]') as { slug?: string }[]
      slugs = Array.isArray(j) ? j.map((u) => String(u.slug ?? '')).filter(Boolean).slice(0, 5) : []
    } catch {
      /* not JSON */
    }
    wp = {
      readme: readme?.status === 200 && /wordpress/i.test(readme.body),
      xmlrpc: Boolean(xml && (xml.status === 405 || /XML-RPC server accepts POST requests only/i.test(xml.body))),
      users: slugs,
      latest,
    }
  }
  return analyzeSite({ url: home.url, status: home.status, headers: home.headers, html: home.body, ms: home.ms, wp })
}
