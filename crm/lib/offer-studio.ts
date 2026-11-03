import 'server-only'
import type { Prisma } from '@prisma/client'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { isLocalDev } from './offers'
import { parseModules, slugProblem } from './offer-modules'
import { prisma } from './prisma'

/**
 * Local studio helpers (NODE_ENV=development only). Offers are created and priced in the live CRM; the studio
 * copies an offer into the local database so the local preview matches, and gives Claude a numbers snapshot.
 *
 * Local .env.local:
 *   OFFER_STUDIO_REMOTE=https://app.igani.co
 *   OFFER_STUDIO_TOKEN=<same value as in Vercel>
 */

const CRM_DIR = process.cwd()
const offersDir = (slug: string): string => join(CRM_DIR, 'offers', slug)

export function studioRemote(): { url: string; token: string } | null {
  const url = process.env.OFFER_STUDIO_REMOTE
  const token = process.env.OFFER_STUDIO_TOKEN
  return url && token && token.length >= 32 ? { url: url.replace(/\/$/, ''), token } : null
}

/** What /api/studio/offers/[slug] returns. */
export interface RemoteOffer {
  slug: string
  title: string
  status: string
  currency: string
  monthlyPrice: number | null
  timelineMonths: number | null
  modules: unknown
  contractUrl: string | null
  contractPublicId: string | null
  contractFileName: string | null
  lead: { firstName: string | null; lastName: string | null; email: string | null; phone: string | null; company: string | null; website: string | null; message: string | null }
  contentReady: boolean
}

export async function fetchRemoteOffer(slug: string): Promise<RemoteOffer | null> {
  const remote = studioRemote()
  if (!remote) return null
  const res = await fetch(`${remote.url}/api/studio/offers/${encodeURIComponent(slug)}`, { headers: { authorization: `Bearer ${remote.token}` }, cache: 'no-store', signal: AbortSignal.timeout(10_000) })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`The live CRM answered ${res.status}. Check OFFER_STUDIO_REMOTE and OFFER_STUDIO_TOKEN.`)
  return (await res.json()) as RemoteOffer
}

/** Copies the live offer (numbers, contract, lead details) into the local database. Returns the local offer id. */
export async function pullOffer(slug: string): Promise<{ id: string } | null> {
  if (!isLocalDev()) throw new Error('The studio only runs locally.')
  const r = await fetchRemoteOffer(slug)
  if (!r) return null
  let lead = r.lead.email ? await prisma.lead.findUnique({ where: { email: r.lead.email }, select: { id: true } }) : null
  lead ??= await prisma.lead.create({
    data: { firstName: r.lead.firstName, lastName: r.lead.lastName, email: r.lead.email, phone: r.lead.phone, company: r.lead.company, website: r.lead.website, message: r.lead.message, source: 'offer-studio', sourceDetail: `Copied from the live CRM for offer ${slug}` },
    select: { id: true },
  })
  const data = {
    title: r.title,
    currency: r.currency,
    monthlyPrice: r.monthlyPrice,
    timelineMonths: r.timelineMonths,
    modules: parseModules(r.modules) as unknown as Prisma.InputJsonValue,
    contractUrl: r.contractUrl,
    contractPublicId: r.contractPublicId,
    contractFileName: r.contractFileName,
    // The local copy stays a draft: signing only ever happens on the live site
    status: 'DRAFT' as const,
  }
  return prisma.offer.upsert({ where: { slug }, create: { slug, leadId: lead.id, ...data }, update: data, select: { id: true } })
}

/** offers/<slug>/offer-data.json: the numbers Claude writes against (not committed; the CRM is the source of truth). */
export async function writeOfferData(slug: string): Promise<void> {
  const o = await prisma.offer.findUnique({ where: { slug }, include: { lead: { select: { firstName: true, lastName: true, email: true, phone: true, company: true, website: true, message: true, budget: true } } } })
  if (!o) return
  const notes = await prisma.leadNote.findMany({ where: { leadId: o.leadId }, orderBy: { createdAt: 'desc' }, take: 20, select: { body: true, createdAt: true } }).catch(() => [])
  mkdirSync(offersDir(slug), { recursive: true })
  const snapshot = {
    _readme: 'Snapshot from the CRM, refreshed every time the studio opens. Do not edit: change numbers in the CRM. Module ids are the keys for content.modules.',
    slug,
    title: o.title,
    currency: o.currency,
    monthlyPrice: o.monthlyPrice,
    timelineMonths: o.timelineMonths,
    modules: parseModules(o.modules),
    hasContract: !!o.contractUrl,
    // Uploaded in the studio: use `logo` as content.client.logo (and in the mockups); `images` are client photos/screenshots
    logo: listAssets(slug).find((x) => x.logo)?.path ?? null,
    images: listAssets(slug).filter((x) => !x.logo).map((x) => x.path),
    client: o.lead,
    crmNotes: notes.map((n) => ({ at: n.createdAt.toISOString().slice(0, 10), text: n.body })),
  }
  writeFileSync(join(offersDir(slug), 'offer-data.json'), JSON.stringify(snapshot, null, 2) + '\n')
}

const CONTENT_TEMPLATE = (slug: string): string => `import type { OfferDefinition } from '../types'
import { screens } from './screens'

/**
 * Offer "${slug}". Claude fills this in from offer-data.json and the conversation in the studio.
 * See offers/CLAUDE.md for how offers work and offers/cryo/ for a complete example.
 */
const offer: OfferDefinition = {
  screens,
  content: {
    defaultLang: 'he',
    client: { name: { he: '', en: '' } },
    hero: { eyebrow: { he: 'הצעת פרויקט', en: 'Project offer' }, title: { he: '', en: '' }, summary: { he: '', en: '' } },
    need: { title: { he: 'הצורך', en: 'The need' }, body: { he: '', en: '' } },
    solution: { title: { he: 'המערכת', en: 'The system' }, body: { he: '', en: '' } },
    flows: [],
    modules: {},
    phases: [],
    nextSteps: { title: { he: 'הצעד הבא', en: 'Next step' }, body: { he: '', en: '' } },
  },
}

export default offer
`

const SCREENS_TEMPLATE = `import type { Screen } from '../types'

/** Mockup screens for this offer. Each one is a React component rendered inside a phone or desktop frame. */
export const screens = {} satisfies Record<string, Screen>
`

/** Creates offers/<slug>/{content,screens}.tsx and registers the offer, the first time only. */
export function scaffoldOffer(slug: string): { created: boolean } {
  if (!isLocalDev()) throw new Error('The studio only runs locally.')
  const problem = slugProblem(slug)
  if (problem) throw new Error(problem)
  const dir = offersDir(slug)
  mkdirSync(dir, { recursive: true })
  let created = false
  if (!existsSync(join(dir, 'content.tsx'))) {
    writeFileSync(join(dir, 'content.tsx'), CONTENT_TEMPLATE(slug))
    created = true
  }
  if (!existsSync(join(dir, 'screens.tsx'))) writeFileSync(join(dir, 'screens.tsx'), SCREENS_TEMPLATE)
  mkdirSync(join(CRM_DIR, 'public', 'offers', slug), { recursive: true })

  const registry = join(CRM_DIR, 'offers', 'registry.ts')
  const src = readFileSync(registry, 'utf8')
  if (!new RegExp(`^\\s+'?${slug}'?: \\(\\)`, 'm').test(src)) {
    const key = /^[a-z_][a-z0-9_]*$/.test(slug) ? slug : `'${slug}'`
    const line = `  ${key}: () => import('./${slug}/content').then((m) => m.default),\n`
    const lines = src.split('\n')
    const start = lines.findIndex((l) => l.includes('export const OFFERS'))
    const end = lines.findIndex((l, i) => i > start && l.startsWith('}'))
    const entries = lines.slice(start + 1, end).filter(Boolean)
    entries.push(line.trimEnd())
    entries.sort((a, b) => a.trim().replace(/'/g, '').localeCompare(b.trim().replace(/'/g, '')))
    writeFileSync(registry, [...lines.slice(0, start + 1), ...entries, ...lines.slice(end)].join('\n'))
  }
  return { created }
}

/** The bridge writes its session token here; the studio page hands it to the browser terminal. */
export function studioToken(): string | null {
  try {
    return readFileSync(join(CRM_DIR, 'studio', '.token'), 'utf8').trim() || null
  } catch {
    return null
  }
}

/** Image types the studio accepts for client assets (logo, photos, screenshots). */
export const ASSET_TYPES: Record<string, string> = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/gif': '.gif' }

/** The client's files in public/offers/<slug>/ (logo first), as paths the offer can use. */
export function listAssets(slug: string): { name: string; path: string; size: number; logo: boolean }[] {
  const dir = join(CRM_DIR, 'public', 'offers', slug)
  try {
    return readdirSync(dir)
      .filter((n) => Object.values(ASSET_TYPES).includes(extname(n).toLowerCase()))
      .map((n) => ({ name: n, path: `/offers/${slug}/${n}`, size: statSync(join(dir, n)).size, logo: /^logo\./i.test(n) }))
      .sort((a, b) => Number(b.logo) - Number(a.logo) || a.name.localeCompare(b.name))
  } catch {
    return []
  }
}
