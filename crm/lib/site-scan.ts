/**
 * Reads a business's own website (home page + a few contact / about / team pages) and pulls out what it publishes:
 * phone numbers, emails, WhatsApp, social pages, and the visible text (for the AI pass that finds named people).
 *
 * Fetching arbitrary URLs from the server is guarded: http(s) on ports 80/443 only, every DNS answer is checked at
 * connect time (no private, loopback, link-local or metadata addresses, also after redirects), 8 s and 1.5 MB per page.
 */
import 'server-only'
import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import zlib from 'node:zlib'
import { toE164 } from './phone-numbers'

export interface SitePage {
  url: string
  html: string
}

export interface SiteFindings {
  phones: string[]
  emails: string[]
  whatsapp: string[]
  socials: { kind: string; url: string }[]
  /** visible text of the pages read, trimmed (for the AI pass) */
  text: string
  pages: string[]
}

const MAX_BYTES = 1_500_000
const TIMEOUT_MS = 8000
const MAX_PAGES = 4

/** Addresses a server must never be tricked into calling. */
export function isPublicIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a = 0, b = 0] = ip.split('.').map(Number)
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false
    if (a === 169 && b === 254) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a === 100 && b >= 64 && b <= 127) return false // carrier NAT
    if (a === 192 && b === 0) return false
    if (a === 198 && (b === 18 || b === 19)) return false
    return true
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase()
    if (v === '::' || v === '::1') return false
    if (v.startsWith('::ffff:')) return isPublicIp(v.slice(7))
    if (/^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith('ff')) return false
    return true
  }
  return false
}

const guardedLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, '', 4)
    const list = addresses as dns.LookupAddress[]
    const bad = list.find((a) => !isPublicIp(a.address))
    if (bad || !list.length) return callback(new Error('blocked address'), '', 4)
    if ((options as { all?: boolean }).all) return (callback as unknown as (e: null, a: dns.LookupAddress[]) => void)(null, list)
    callback(null, list[0]!.address, list[0]!.family)
  })
}

function allowedUrl(raw: string): URL | null {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (u.port && u.port !== '80' && u.port !== '443') return null
    if (u.username || u.password) return null
    // literal IPs must be public too (the lookup isn't used for them)
    const host = u.hostname.replace(/^\[|\]$/g, '')
    if (net.isIP(host) && !isPublicIp(host)) return null
    if (/^(localhost|.*\.local|.*\.internal)$/i.test(host)) return null
    return u
  } catch {
    return null
  }
}

function getOnce(u: URL): Promise<{ status: number; location: string | null; type: string; body: string }> {
  return new Promise((resolve, reject) => {
    const mod = u.protocol === 'https:' ? https : http
    const req = mod.request(
      u,
      {
        method: 'GET',
        lookup: guardedLookup,
        timeout: TIMEOUT_MS,
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; IganiCRM/1.0; +https://igani.co)', accept: 'text/html,application/xhtml+xml', 'accept-encoding': 'gzip, deflate, br', 'accept-language': 'he,en;q=0.8' },
      },
      (res) => {
        const status = res.statusCode ?? 0
        const location = typeof res.headers.location === 'string' ? res.headers.location : null
        const type = String(res.headers['content-type'] ?? '')
        if ((status >= 300 && status < 400) || !/html|xml/i.test(type)) {
          res.resume()
          return resolve({ status, location, type, body: '' })
        }
        const enc = String(res.headers['content-encoding'] ?? '').toLowerCase()
        const stream = enc === 'gzip' ? res.pipe(zlib.createGunzip()) : enc === 'deflate' ? res.pipe(zlib.createInflate()) : enc === 'br' ? res.pipe(zlib.createBrotliDecompress()) : res
        const chunks: Buffer[] = []
        let size = 0
        stream.on('data', (c: Buffer) => {
          size += c.length
          if (size > MAX_BYTES) {
            req.destroy()
            stream.destroy()
            resolve({ status, location, type, body: Buffer.concat(chunks).toString('utf8') })
            return
          }
          chunks.push(c)
        })
        stream.on('end', () => resolve({ status, location, type, body: Buffer.concat(chunks).toString('utf8') }))
        stream.on('error', reject)
      },
    )
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
    req.end()
  })
}

/** GET an HTML page, following up to 3 redirects, each one checked again. */
export async function fetchPage(raw: string): Promise<SitePage | null> {
  let u = allowedUrl(raw)
  for (let hop = 0; u && hop < 4; hop++) {
    const r = await getOnce(u).catch(() => null)
    if (!r) return null
    if (r.status >= 300 && r.status < 400 && r.location) {
      u = allowedUrl(new URL(r.location, u).toString())
      continue
    }
    if (r.status >= 400 || !r.body) return null
    return { url: u.toString(), html: r.body }
  }
  return null
}

const decode = (s: string): string =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))

/** The page's readable text (no scripts, styles or tags). */
export function visibleText(html: string): string {
  return decode(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr|section|article|header|footer)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

const hrefs = (html: string): { href: string; text: string }[] =>
  [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: decode(m[1]!.trim()), text: visibleText(m[2] ?? '').slice(0, 80) }))

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24}/g
const JUNK_EMAIL = /\.(png|jpe?g|gif|svg|webp|css|js)$|@(example|sentry|wixpress|sentry-next|domain|email)\.|^(name|your|you|user|email)@/i
const PHONE = /(?:\+972[\s-]?|0)(?:[23489]|5\d|7[2-9])[\s-]?\d{3}[\s-]?\d{4}|1[-\s]?800[-\s]?\d{2,3}[-\s]?\d{3,4}/g
const SOCIAL: [string, RegExp][] = [
  ['facebook', /^https?:\/\/(www\.|m\.)?facebook\.com\/(?!sharer|share|dialog|plugins|tr\b)[^?#]+/i],
  ['instagram', /^https?:\/\/(www\.)?instagram\.com\/(?!p\/|share)[^?#/]+/i],
  ['linkedin', /^https?:\/\/([a-z]+\.)?linkedin\.com\/(company|in|school)\/[^?#]+/i],
  ['tiktok', /^https?:\/\/(www\.)?tiktok\.com\/@[^?#/]+/i],
  ['youtube', /^https?:\/\/(www\.)?youtube\.com\/(@|channel\/|c\/|user\/)[^?#]+/i],
  ['x', /^https?:\/\/(www\.)?(twitter|x)\.com\/(?!intent|share|home)[^?#/]+/i],
]

/** Phones, emails, WhatsApp and social pages published on these pages (phones as E.164, deduped). */
export function extractContacts(pages: SitePage[]): Omit<SiteFindings, 'text' | 'pages'> {
  const phones = new Set<string>()
  const emails = new Set<string>()
  const whatsapp = new Set<string>()
  const socials = new Map<string, string>()
  for (const p of pages) {
    const links = hrefs(p.html)
    const text = visibleText(p.html)
    for (const { href } of links) {
      if (/^tel:/i.test(href)) {
        const e = toE164(decodeURIComponent(href.slice(4)))
        if (e) phones.add(e)
      } else if (/^mailto:/i.test(href)) {
        const e = decodeURIComponent(href.slice(7)).split('?')[0]!.trim().toLowerCase()
        if (/^[^@\s]+@[^@\s]+\.[a-z]{2,24}$/i.test(e) && !JUNK_EMAIL.test(e)) emails.add(e)
      } else if (/^https?:\/\/(wa\.me|api\.whatsapp\.com|wa\.link|web\.whatsapp\.com)\//i.test(href)) {
        const num = href.match(/wa\.me\/(\+?\d{8,15})/i)?.[1] ?? href.match(/[?&]phone=(\+?\d{8,15})/i)?.[1]
        const e = num ? toE164(num.startsWith('+') ? num : `+${num}`) : null
        if (e) whatsapp.add(e)
      } else {
        for (const [kind, re] of SOCIAL) {
          const m = href.match(re)
          if (m && !socials.has(kind)) socials.set(kind, m[0].replace(/\/$/, ''))
        }
      }
    }
    for (const m of text.match(EMAIL) ?? []) {
      const e = m.toLowerCase().replace(/\.$/, '')
      if (!JUNK_EMAIL.test(e)) emails.add(e)
    }
    for (const m of text.match(PHONE) ?? []) {
      const e = toE164(m)
      if (e) phones.add(e)
    }
  }
  return { phones: [...phones].slice(0, 12), emails: [...emails].slice(0, 12), whatsapp: [...whatsapp].slice(0, 4), socials: [...socials].map(([kind, url]) => ({ kind, url })) }
}

const CONTACTISH = /contact|about|team|staff|agents|our-|people|צור|קשר|אודות|צוות|הצוות|סוכנים|מי-אנחנו|who-we/i

/** Up to 3 same-site pages likely to list people and contact details. */
export function contactPageLinks(page: SitePage): string[] {
  const base = new URL(page.url)
  const out: string[] = []
  for (const { href, text } of hrefs(page.html)) {
    if (!CONTACTISH.test(href) && !CONTACTISH.test(text)) continue
    try {
      const u = new URL(href, base)
      u.hash = ''
      if (u.hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '')) continue
      if (/\.(pdf|jpe?g|png|zip|docx?)$/i.test(u.pathname)) continue
      const s = u.toString()
      if (s !== page.url && !out.includes(s)) out.push(s)
    } catch {
      /* bad link */
    }
    if (out.length >= MAX_PAGES - 1) break
  }
  return out
}

/** Read the site and collect everything it publishes. null if the site can't be read. */
export async function scanSite(website: string): Promise<SiteFindings | null> {
  const home = await fetchPage(website)
  if (!home) return null
  const extra = (await Promise.all(contactPageLinks(home).map((u) => fetchPage(u)))).filter((p): p is SitePage => p !== null)
  const pages = [home, ...extra]
  const found = extractContacts(pages)
  const text = pages
    .map((p) => `--- ${p.url}\n${visibleText(p.html).slice(0, 6000)}`)
    .join('\n\n')
    .slice(0, 16000)
  return { ...found, text, pages: pages.map((p) => p.url) }
}
