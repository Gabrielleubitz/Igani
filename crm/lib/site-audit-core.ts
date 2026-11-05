/**
 * "What's wrong with this site": reads what any visitor's browser would get from a business's website and lists the
 * problems a salesman can open a call with. Pure functions (no network, no database) so every rule can be unit-tested.
 * Each finding comes from something actually seen on the page or in the response; we say "looks like" and "signs of",
 * never that a site "is hacked". Nothing is probed beyond ordinary public addresses.
 */

export type Level = 'high' | 'medium' | 'low' | 'good'
export type Group = 'security' | 'cost' | 'basics'

export interface Finding {
  id: string
  group: Group
  level: Level
  title: string
  /** what was seen, in plain words */
  detail: string
  /** a sentence the salesman can say, or null */
  say: string | null
}

export interface SiteSnapshot {
  /** final address after redirects */
  url: string
  status: number
  headers: Record<string, string>
  html: string
  /** milliseconds to get the page */
  ms: number
  /** only for WordPress sites: the few public addresses we looked at */
  wp?: {
    readme: boolean
    xmlrpc: boolean
    /** user slugs listed publicly by the REST API */
    users: string[]
    /** newest release from wordpress.org, when we could get it */
    latest: string | null
  }
  now?: Date
}

export interface SiteReport {
  url: string
  platform: { name: string; version: string | null; kind: 'wordpress' | 'hosted' | 'custom' }
  findings: Finding[]
  /** the best one or two things to say first */
  opener: string | null
  checkedAt: string
}

function host(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u
  }
}

// ─── Platform ──────────────────────────────────────────────────────────────

const HOSTED: { name: string; test: RegExp }[] = [
  { name: 'Wix', test: /static\.wixstatic\.com|wix\.com\/|X-Wix-|<meta[^>]+generator[^>]+Wix\.com/i },
  { name: 'Squarespace', test: /static1?\.squarespace\.com|<meta[^>]+generator[^>]+Squarespace/i },
  { name: 'Shopify', test: /cdn\.shopify\.com|Shopify\.theme|<meta[^>]+generator[^>]+Shopify/i },
  { name: 'Webflow', test: /<html[^>]+data-wf-|assets(-global)?\.website-files\.com|<meta[^>]+generator[^>]+Webflow/i },
  { name: 'GoDaddy Website Builder', test: /img1\.wsimg\.com|<meta[^>]+generator[^>]+GoDaddy/i },
  { name: 'Weebly', test: /weebly\.com|editmysite\.com/i },
  { name: 'Jimdo', test: /jimdo(free|site)?\.com|<meta[^>]+generator[^>]+Jimdo/i },
]

const num = (v: string): number[] => v.split('.').map((n) => Number.parseInt(n, 10) || 0)
export function compareVersions(a: string, b: string): number {
  const x = num(a)
  const y = num(b)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0)
    if (d !== 0) return d < 0 ? -1 : 1
  }
  return 0
}

export function detectPlatform(html: string, headers: Record<string, string>): SiteReport['platform'] {
  const gen = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']generator["']/i)?.[1] ?? ''
  const wp = /\/wp-content\/|\/wp-includes\/|wp-json/i.test(html) || /^WordPress/i.test(gen) || /wp-json/i.test(headers.link ?? '')
  if (wp) {
    const v = gen.match(/WordPress\s+([\d.]+)/i)?.[1] ?? null
    return { name: 'WordPress', version: v, kind: 'wordpress' }
  }
  const host = HOSTED.find((h) => h.test.test(html) || h.test.test(Object.entries(headers).map(([k, v]) => `${k}: ${v}`).join('\n')))
  if (host) return { name: host.name, version: null, kind: 'hosted' }
  return { name: gen ? gen.split(/\s+/)[0]! : 'Custom or unknown', version: null, kind: 'custom' }
}

// ─── PHP ───────────────────────────────────────────────────────────────────

/** End of security support per PHP release line (php.net/supported-versions). */
const PHP_EOL: Record<string, string> = { '7.4': '2022-11-28', '8.0': '2023-11-26', '8.1': '2025-12-31', '8.2': '2026-12-31', '8.3': '2027-12-31' }

export function phpVersion(headers: Record<string, string>): string | null {
  return (headers['x-powered-by'] ?? '').match(/PHP\/(\d+\.\d+(?:\.\d+)?)/i)?.[1] ?? null
}

/** Whether this PHP version no longer gets security fixes on `now`. null when we do not know the release line. */
export function phpEnded(version: string, now: Date): boolean | null {
  const [maj = 0, min = 0] = num(version)
  if (maj < 7 || (maj === 7 && min < 4)) return true
  const eol = PHP_EOL[`${maj}.${min}`]
  return eol ? now.getTime() > Date.parse(eol) : null
}

// ─── Signs of tampering ───────────────────────────────────────────────────

const SPAM = /\b(viagra|cialis|levitra|payday loans?|casino|slot gacor|porn|escort|replica watches?|essay writing|bitcoin casino|online pharmacy)\b/i
const OBFUSCATED = [/eval\(\s*function\(p,a,c,k,e,[dr]\)/i, /eval\(\s*atob\(/i, /document\.write\(\s*unescape\(/i, /String\.fromCharCode\((?:\s*\d+\s*,){25,}/i, /\batob\(['"][A-Za-z0-9+/=]{200,}['"]\)/i]
const HIDDEN_BOX = /<(?:div|span|p)[^>]+style=["'][^"']*(?:left:\s*-\d{3,}px|top:\s*-\d{3,}px|display:\s*none|visibility:\s*hidden|height:\s*0|font-size:\s*0)[^"']*["'][^>]*>([\s\S]{0,1500}?)<\/(?:div|span|p)>/gi
const BAD_TLD = /^(?:[a-z0-9-]+\.)*[a-z0-9-]+\.(?:xyz|top|ru|su|tk|icu|click|work|gq|ml|cf|ga|buzz|monster)$/i

export function tamperSigns(html: string, siteHost: string): { what: string }[] {
  const out: { what: string }[] = []
  const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1] ?? '')
  if (scripts.some((s) => OBFUSCATED.some((re) => re.test(s)))) out.push({ what: 'scrambled script code on the page (the kind malware uses to hide itself)' })
  for (const m of html.matchAll(/<script\b[^>]+src=["'](https?:)?\/\/([^/"']+)/gi)) {
    const h = (m[2] ?? '').toLowerCase()
    if (BAD_TLD.test(h) && h !== siteHost) out.push({ what: `a script loaded from an unusual outside address (${h})` })
  }
  // Google Tag Manager's own hidden frame (inside <noscript>) is on a huge share of ordinary sites; it is not a sign of trouble.
  const frames = html.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ').replace(/<iframe\b[^>]+src=["'](?:https?:)?\/\/(?:www\.)?googletagmanager\.com[^>]*>/gi, ' ')
  if (/<iframe\b[^>]*(?:width=["']?[01](?:px)?(?=["'\s>])|height=["']?[01](?:px)?(?=["'\s>])|display:\s*none|visibility:\s*hidden)/i.test(frames)) out.push({ what: 'a hidden frame (an invisible box that loads another site)' })
  const refresh = html.match(/<meta[^>]+http-equiv=["']refresh["'][^>]+content=["']\d+;\s*url=(https?:\/\/[^"'\s]+)/i)?.[1]
  if (refresh && host(refresh) !== siteHost) out.push({ what: 'an automatic redirect to a different site' })
  for (const m of html.matchAll(HIDDEN_BOX)) {
    const inner = m[1] ?? ''
    if ((inner.match(/<a\b/gi) ?? []).length >= 3 || SPAM.test(inner)) {
      out.push({ what: 'hidden text with links or spam words, placed off screen so only Google sees it' })
      break
    }
  }
  const visible = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
  const spam = visible.match(SPAM)?.[0]
  if (spam) out.push({ what: `a spam word that does not belong on this kind of site (“${spam.toLowerCase()}”)` })
  return out.filter((o, i, a) => a.findIndex((x) => x.what === o.what) === i)
}

// ─── Costly set-ups ───────────────────────────────────────────────────────

const PAID: { slug: RegExp; name: string }[] = [
  { slug: /elementor-pro/i, name: 'Elementor Pro' },
  { slug: /revslider|rev-slider/i, name: 'Slider Revolution' },
  { slug: /js_composer|wpbakery/i, name: 'WPBakery' },
  { slug: /\/themes\/Divi\b|\/et-core/i, name: 'Divi' },
  { slug: /wp-rocket/i, name: 'WP Rocket' },
  { slug: /gravityforms/i, name: 'Gravity Forms' },
  { slug: /sitepress|wpml/i, name: 'WPML' },
  { slug: /woocommerce-subscriptions|woocommerce-memberships/i, name: 'WooCommerce paid extensions' },
]

export function wpPlugins(html: string): { slug: string; version: string | null }[] {
  const seen = new Map<string, string | null>()
  for (const m of html.matchAll(/\/wp-content\/plugins\/([a-z0-9_-]+)\/[^"'\s]*?(?:\?ver=([\d.]+))?["'\s]/gi)) {
    const slug = m[1]!.toLowerCase()
    if (!seen.has(slug) || (!seen.get(slug) && m[2])) seen.set(slug, m[2] ?? null)
  }
  return [...seen].map(([slug, version]) => ({ slug, version })).slice(0, 40)
}

// ─── The report ───────────────────────────────────────────────────────────

const F = (f: Finding): Finding => f
const ORDER: Record<Level, number> = { high: 0, medium: 1, low: 2, good: 3 }

export function analyzeSite(s: SiteSnapshot): SiteReport {
  const now = s.now ?? new Date()
  const platform = detectPlatform(s.html, s.headers)
  const h = host(s.url)
  const f: Finding[] = []

  // Security: WordPress
  if (platform.kind === 'wordpress') {
    const latest = s.wp?.latest ?? null
    if (platform.version && latest) {
      const c = compareVersions(platform.version, latest)
      const [vMaj = 0, vMin = 0] = num(platform.version)
      const [lMaj = 0, lMin = 0] = num(latest)
      // WordPress back-ports security fixes to recent branches, so one release behind is worth raising, several is serious.
      const far = lMaj - vMaj >= 2 || (lMaj === vMaj && lMin - vMin >= 3)
      if (c < 0) {
        f.push(F({ id: 'wp-old', group: 'security', level: far ? 'high' : 'medium', title: `WordPress ${platform.version} is out of date`, detail: `The site announces WordPress ${platform.version}. The current release is ${latest}. Old versions are the ones attackers go after, because their holes are public.`, say: `Your site is running an old version of WordPress (${platform.version}). Those are the ones that get broken into. Has anyone been keeping it updated?` }))
      } else f.push(F({ id: 'wp-current', group: 'security', level: 'good', title: 'WordPress is up to date', detail: `Version ${platform.version}.`, say: null }))
    } else if (platform.version) {
      f.push(F({ id: 'wp-version-shown', group: 'security', level: 'low', title: `The site tells everyone it runs WordPress ${platform.version}`, detail: 'Showing the exact version helps an attacker pick the right hole.', say: null }))
    }
    if (s.wp?.readme) f.push(F({ id: 'wp-readme', group: 'security', level: 'low', title: 'WordPress’s readme file is public', detail: 'The file readme.html is open to anyone and reveals the version.', say: null }))
    if (s.wp?.users.length) {
      const admin = s.wp.users.some((u) => /^admin(istrator)?$/i.test(u))
      f.push(F({ id: 'wp-users', group: 'security', level: admin ? 'high' : 'medium', title: `Login names are public (${s.wp.users.slice(0, 4).join(', ')})`, detail: `Anyone can list the site’s users from the address /wp-json/wp/v2/users.${admin ? ' One is “admin”, the first name every attacker tries.' : ''} With the name known, only the password is left to guess.`, say: `Anyone can see the usernames of your site’s accounts, and that is half of what someone needs to break in.` }))
    }
    if (s.wp?.xmlrpc) f.push(F({ id: 'wp-xmlrpc', group: 'security', level: 'medium', title: 'The old remote-access door (xmlrpc.php) is open', detail: 'It is rarely needed, and is used to guess passwords thousands of times a minute.', say: null }))
    const plugins = wpPlugins(s.html)
    if (plugins.length >= 15) f.push(F({ id: 'wp-many-plugins', group: 'security', level: 'medium', title: `${plugins.length} plugins are visible on the home page`, detail: 'Every plugin is another program that needs updating. Most WordPress break-ins come in through a plugin.', say: `Your site loads ${plugins.length} plugins. Each one is a door that has to be kept up to date. Who does that for you?` }))
    else if (plugins.length) f.push(F({ id: 'wp-plugins', group: 'security', level: 'low', title: `${plugins.length} plugin${plugins.length === 1 ? '' : 's'} visible`, detail: plugins.slice(0, 8).map((p) => p.slug + (p.version ? ` ${p.version}` : '')).join(', '), say: null }))
    const paid = PAID.filter((p) => p.slug.test(s.html)).map((p) => p.name)
    if (paid.length) f.push(F({ id: 'cost-paid-plugins', group: 'cost', level: 'medium', title: `Paid add-ons: ${paid.join(', ')}`, detail: 'These need a licence every year to keep getting updates. Skip one and the site stops being patched.', say: `Your site depends on paid add-ons (${paid.slice(0, 3).join(', ')}) that each charge a yearly licence. Are you paying for those every year?` }))
  }

  // Security: PHP
  const php = phpVersion(s.headers)
  if (php) {
    const ended = phpEnded(php, now)
    f.push(ended ? F({ id: 'php-old', group: 'security', level: 'high', title: `Server runs PHP ${php}, which no longer gets security fixes`, detail: 'The server’s own response says so. Once a PHP version is retired, new holes are never patched.', say: `Your website’s server is on PHP ${php}, which stopped getting security fixes. That is how most WordPress sites get hacked.` }) : F({ id: 'php-shown', group: 'security', level: 'low', title: `Server tells everyone it runs PHP ${php}`, detail: 'Not needed. It is better hidden.', say: null }))
  }

  // Security: signs of tampering
  const signs = tamperSigns(s.html, h)
  if (signs.length) f.push(F({ id: 'tamper', group: 'security', level: 'high', title: 'Signs the site may have been tampered with', detail: 'Things that normally appear only after a hack: ' + signs.map((x) => x.what).join('; ') + '. This is a sign to check, not proof.', say: `I noticed something odd on your site: ${signs[0]!.what}. That is often a sign someone got in. Have you had the site checked?` }))

  if (!/^https:/i.test(s.url)) f.push(F({ id: 'no-https', group: 'security', level: 'high', title: 'The site is not secure (no HTTPS)', detail: 'Browsers show “Not secure” next to the address, and Google ranks the site lower.', say: `Your site shows “Not secure” in the browser. Visitors see it before they see you.` }))
  else if (/<(?:script|img|iframe)\b[^>]+src=["']http:\/\/|<link\b[^>]+rel=["']stylesheet["'][^>]+href=["']http:\/\//i.test(s.html)) f.push(F({ id: 'mixed', group: 'security', level: 'low', title: 'Some parts load without the lock (mixed content)', detail: 'Parts of the page still load over plain http, which can trigger browser warnings.', say: null }))

  // Costly: hosted platforms
  if (platform.kind === 'hosted') f.push(F({ id: 'cost-platform', group: 'cost', level: 'medium', title: `Built on ${platform.name}: a monthly plan, and the site is not theirs`, detail: `${platform.name} charges every month and the site cannot be moved out as it is. If they stop paying, it disappears. Check the plan they are on before you quote.`, say: `Your site is on ${platform.name}. Are you paying them every month, and do you know what that adds up to over a few years?` }))

  // Basics
  if (s.ms > 3000) f.push(F({ id: 'slow', group: 'basics', level: s.ms > 6000 ? 'high' : 'medium', title: `Slow: ${(s.ms / 1000).toFixed(1)} seconds just to start loading`, detail: 'Measured from our server, before images and scripts. Visitors leave long before this.', say: `Your site took about ${Math.round(s.ms / 1000)} seconds to start loading. Most people leave after three.` }))
  else f.push(F({ id: 'speed-ok', group: 'basics', level: 'good', title: `Starts loading in ${(s.ms / 1000).toFixed(1)} seconds`, detail: 'Measured from our server.', say: null }))
  if (s.html.length > 600_000) f.push(F({ id: 'heavy', group: 'basics', level: 'medium', title: 'The page is very heavy', detail: `${Math.round(s.html.length / 1000)} KB of code on the home page alone, before images.`, say: null }))
  if (!/<meta[^>]+name=["']viewport["']/i.test(s.html)) f.push(F({ id: 'mobile', group: 'basics', level: 'high', title: 'Not set up for phones', detail: 'No mobile viewport. On a phone the page appears as a tiny desktop page.', say: `On a phone your site shows up as a tiny desktop page. Most of your visitors are on phones.` }))
  if (!/<title>\s*[^<\s][^<]*<\/title>/i.test(s.html)) f.push(F({ id: 'no-title', group: 'basics', level: 'medium', title: 'The page has no title', detail: 'The title is the blue link people see on Google.', say: null }))
  if (!/<meta[^>]+name=["']description["'][^>]+content=["'][^"']{20,}/i.test(s.html)) f.push(F({ id: 'no-desc', group: 'basics', level: 'low', title: 'No search description', detail: 'Google picks random text to show under the link.', say: null }))
  if (!/<h1[\s>]/i.test(s.html)) f.push(F({ id: 'no-h1', group: 'basics', level: 'low', title: 'No main heading', detail: 'The page has no H1, which helps search engines understand it.', say: null }))
  const imgs = [...s.html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0])
  const noAlt = imgs.filter((t) => !/\balt=["'][^"']+["']/i.test(t)).length
  if (imgs.length >= 5 && noAlt / imgs.length > 0.5) f.push(F({ id: 'alt', group: 'basics', level: 'low', title: `${noAlt} of ${imgs.length} images have no description`, detail: 'Bad for search and for blind visitors.', say: null }))
  if (!/href=["'](?:tel:|mailto:|https?:\/\/(?:wa\.me|api\.whatsapp\.com))/i.test(s.html) && !/<form\b/i.test(s.html)) f.push(F({ id: 'no-cta', group: 'basics', level: 'high', title: 'No easy way to contact them on the home page', detail: 'No phone link, email link, WhatsApp button or form was found.', say: `I could not find a way to contact you from your home page. A visitor who wants to buy has nowhere to click.` }))
  const years = [...s.html.matchAll(/(?:©|&copy;|copyright)[^<]{0,40}?(20\d{2})/gi)].map((m) => Number(m[1]))
  const year = years.length ? Math.max(...years) : null
  if (year && now.getFullYear() - year >= 2) f.push(F({ id: 'stale', group: 'basics', level: 'low', title: `The footer still says ${year}`, detail: 'It looks like nobody has touched the site for a while.', say: null }))

  f.sort((a, b) => ORDER[a.level] - ORDER[b.level])
  const say = f.filter((x) => x.say && (x.level === 'high' || x.level === 'medium')).slice(0, 2).map((x) => x.say as string)
  return { url: s.url, platform, findings: f, opener: say.length ? say.join(' ') : null, checkedAt: now.toISOString() }
}
