import 'server-only'
import { asClicks, asMoves, heatPoints, offerStats, SECTION_ORDER, type OfferStats } from './offer-tracking'
import { prisma } from './prisma'

export type HeatDevice = 'desktop' | 'phone'
export interface OfferInsights {
  stats: OfferStats
  recent: { id: string; startedAt: string; device: string; seconds: number; scroll: number; clicks: number; country: string | null; referrer: string | null; returning: boolean }[]
  heat: Record<HeatDevice, { clicks: ReturnType<typeof heatPoints>; moves: ReturnType<typeof heatPoints>; visits: number }>
}

interface Row {
  id: string
  visitorId: string
  startedAt: Date
  durationMs: number
  maxScrollPct: number
  device: string
  country: string | null
  referrer: string | null
  utmSource?: string | null
  sections: unknown
  clicks: unknown
  moves?: unknown
}

/** Summary, recent visits and heatmap points from visit rows (newest first). Shared by offers and website pages. */
/**
 * Summary, recent visits and heatmap points. `moveRows` (recent visits with their mouse samples) is loaded
 * separately and smaller, so a busy page never pulls millions of points into one request.
 */
export function insightsFromRows(rows: Row[], sectionOrder: string[] = [], moveRows: { device: string; moves?: unknown }[] = rows): OfferInsights {
  // A visit is "returning" when the same browser came before it
  const before = new Set<string>()
  const returning = new Set<string>()
  for (const r of [...rows].reverse()) {
    if (before.has(r.visitorId)) returning.add(r.id)
    before.add(r.visitorId)
  }
  const recent = rows.slice(0, 25).map((r) => ({
    id: r.id,
    startedAt: r.startedAt.toISOString(),
    device: r.device,
    seconds: Math.round(r.durationMs / 1000),
    scroll: r.maxScrollPct,
    clicks: asClicks(r.clicks).length,
    country: r.country,
    referrer: r.utmSource ? `${r.referrer ? `${r.referrer}, ` : ''}utm ${r.utmSource}` : r.referrer,
    returning: returning.has(r.id),
  }))
  const bucket = (d: string): HeatDevice => (d === 'phone' ? 'phone' : 'desktop') // tablets draw on the desktop layout
  const heat = Object.fromEntries(
    (['desktop', 'phone'] as const).map((dev) => {
      const mine = rows.filter((r) => bucket(r.device) === dev)
      const withMoves = moveRows.filter((r) => bucket(r.device) === dev)
      return [dev, { visits: mine.length, clicks: heatPoints(mine.map((r) => asClicks(r.clicks)), 6000), moves: heatPoints(withMoves.map((r) => asMoves(r.moves)), 25000) }]
    }),
  ) as OfferInsights['heat']
  return { stats: offerStats(rows, sectionOrder), recent, heat }
}

/** Everything the admin offer page shows about client visits (last 500 visits). */
const SUMMARY = { id: true, visitorId: true, startedAt: true, durationMs: true, maxScrollPct: true, device: true, country: true, referrer: true, sections: true, clicks: true } as const
const MOVE_VISITS = 300

export async function loadOfferInsights(offerId: string): Promise<OfferInsights> {
  const where = { offerId }
  const [rows, moveRows] = await Promise.all([
    prisma.offerVisit.findMany({ where, orderBy: { startedAt: 'desc' }, take: 500, select: SUMMARY }),
    prisma.offerVisit.findMany({ where, orderBy: { startedAt: 'desc' }, take: MOVE_VISITS, select: { device: true, moves: true } }),
  ])
  return insightsFromRows(rows, SECTION_ORDER, moveRows)
}

/** Visits to one main-website page in the last `days` days (at most 2,000). */
export async function loadSiteInsights(page: string, days: number): Promise<OfferInsights> {
  const where = { page, startedAt: { gte: new Date(Date.now() - days * 86_400_000) } }
  const [rows, moveRows] = await Promise.all([
    prisma.siteVisit.findMany({ where, orderBy: { startedAt: 'desc' }, take: 2000, select: { ...SUMMARY, utmSource: true } }),
    prisma.siteVisit.findMany({ where, orderBy: { startedAt: 'desc' }, take: MOVE_VISITS, select: { device: true, moves: true } }),
  ])
  return insightsFromRows(rows, [], moveRows)
}
