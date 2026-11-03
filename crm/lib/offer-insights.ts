import 'server-only'
import { asClicks, asMoves, heatPoints, offerStats, SECTION_ORDER, type OfferStats } from './offer-tracking'
import { prisma } from './prisma'

export type HeatDevice = 'desktop' | 'phone'
export interface OfferInsights {
  stats: OfferStats
  recent: { id: string; startedAt: string; device: string; seconds: number; scroll: number; clicks: number; country: string | null; referrer: string | null; returning: boolean }[]
  heat: Record<HeatDevice, { clicks: ReturnType<typeof heatPoints>; moves: ReturnType<typeof heatPoints>; visits: number }>
}

/** Everything the admin offer page shows about client visits (last 500 visits). */
export async function loadOfferInsights(offerId: string): Promise<OfferInsights> {
  const rows = await prisma.offerVisit.findMany({ where: { offerId }, orderBy: { startedAt: 'desc' }, take: 500 })
  // A visit is "returning" when the same browser came before it
  const before = new Map<string, number>()
  const returning = new Set<string>()
  for (const r of [...rows].reverse()) {
    if (before.has(r.visitorId)) returning.add(r.id)
    before.set(r.visitorId, 1)
  }
  const recent = rows
    .slice(0, 25)
    .map((r) => ({ id: r.id, startedAt: r.startedAt.toISOString(), device: r.device, seconds: Math.round(r.durationMs / 1000), scroll: r.maxScrollPct, clicks: asClicks(r.clicks).length, country: r.country, referrer: r.referrer, returning: returning.has(r.id) }))
  const bucket = (d: string): HeatDevice => (d === 'phone' ? 'phone' : 'desktop') // tablets draw on the desktop layout
  const heat = Object.fromEntries(
    (['desktop', 'phone'] as const).map((dev) => {
      const mine = rows.filter((r) => bucket(r.device) === dev)
      return [dev, { visits: mine.length, clicks: heatPoints(mine.map((r) => asClicks(r.clicks)), 6000), moves: heatPoints(mine.map((r) => asMoves(r.moves)), 25000) }]
    }),
  ) as OfferInsights['heat']
  return { stats: offerStats(rows, SECTION_ORDER), recent, heat }
}
