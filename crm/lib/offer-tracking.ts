import { z } from 'zod'

/**
 * Offer page analytics (our own Hotjar). The browser sends small batches every few seconds; each batch carries the
 * running totals (time, scroll, per-section time) plus the clicks and mouse samples since the last batch.
 * Positions are fractions inside the page section they happened in (sections are the offer page's <section id>),
 * so a heatmap drawn on any screen width lines up.
 */

export const MAX_CLICKS = 400
export const MAX_MOVES = 4000
export const MAX_BODY_BYTES = 48_000
/** New visits one IP may start on one offer per hour (stops someone flooding the table) */
export const MAX_NEW_VISITS_PER_HOUR = 40
/** Sections kept per visit (a page has ~12; anything beyond is junk) */
export const MAX_SECTIONS = 40
const SIX_HOURS = 6 * 3600_000

const Id = z.string().regex(/^[A-Za-z0-9-]{16,64}$/)
const Section = z.string().regex(/^[a-z0-9-]{1,48}$/)
const Frac = z.number().min(0).max(1)
const Point = z.object({ s: Section, x: Frac, y: Frac })

export const TrackBatch = z.object({
  key: Id,
  visitorId: Id,
  device: z.enum(['phone', 'tablet', 'desktop']),
  vw: z.number().int().min(200).max(8000),
  vh: z.number().int().min(200).max(8000),
  lang: z.enum(['he', 'en']).optional(),
  ref: z.string().max(300).optional(),
  durationMs: z.number().int().min(0).max(SIX_HOURS),
  maxScroll: z.number().int().min(0).max(100),
  sections: z.record(Section, z.number().int().min(0).max(SIX_HOURS)).refine((r) => Object.keys(r).length <= 40),
  clicks: z.array(Point.extend({ t: z.number().int().min(0).max(SIX_HOURS), l: z.string().max(60).optional() })).max(60),
  moves: z.array(Point).max(400),
})
export type TrackBatch = z.infer<typeof TrackBatch>

export type Click = { s: string; x: number; y: number; t: number; l?: string }
export type Move = { s: string; x: number; y: number }
export interface VisitTotals {
  durationMs: number
  maxScrollPct: number
  sections: Record<string, number>
  clicks: Click[]
  moves: Move[]
}

const r3 = (n: number): number => Math.round(n * 1000) / 1000

/** Fold a batch into what is stored. Totals only go up (a late, out-of-order batch never lowers them); lists are capped. */
export function mergeVisit(prev: VisitTotals | null, b: TrackBatch): VisitTotals {
  const sections: Record<string, number> = { ...(prev?.sections ?? {}) }
  for (const [k, v] of Object.entries(b.sections)) {
    if (!(k in sections) && Object.keys(sections).length >= MAX_SECTIONS) continue // never grows past the cap
    sections[k] = Math.max(sections[k] ?? 0, v)
  }
  return {
    durationMs: Math.max(prev?.durationMs ?? 0, b.durationMs),
    maxScrollPct: Math.max(prev?.maxScrollPct ?? 0, b.maxScroll),
    sections,
    clicks: [...(prev?.clicks ?? []), ...b.clicks.map((c) => ({ s: c.s, x: r3(c.x), y: r3(c.y), t: c.t, ...(c.l ? { l: c.l } : {}) }))].slice(0, MAX_CLICKS),
    moves: [...(prev?.moves ?? []), ...b.moves.map((m) => ({ s: m.s, x: r3(m.x), y: r3(m.y) }))].slice(0, MAX_MOVES),
  }
}

/** A visit may be extended only for a few hours after it started (an old tab coming back starts a fresh row). */
export const visitStillOpen = (startedAt: Date, now = new Date()): boolean => now.getTime() - startedAt.getTime() < SIX_HOURS

export const asClicks = (v: unknown): Click[] => (Array.isArray(v) ? (v as Click[]) : [])
export const asMoves = (v: unknown): Move[] => (Array.isArray(v) ? (v as Move[]) : [])
export const asSections = (v: unknown): Record<string, number> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, number>) : {})

export interface VisitRow {
  visitorId: string
  startedAt: Date
  durationMs: number
  maxScrollPct: number
  device: string
  sections: unknown
  clicks: unknown
}

export interface OfferStats {
  visits: number
  visitors: number
  returning: number
  avgSeconds: number
  avgScroll: number
  /** Share of visits that scrolled at least 25 / 50 / 75 / 100 % of the page */
  reach: { at: number; pct: number }[]
  /** Per section: share of visits that looked at it (≥ 2 s) and average seconds among those */
  sections: { id: string; seenPct: number; avgSeconds: number }[]
  topClicks: { label: string; count: number }[]
  devices: Record<string, number>
  lastVisit: Date | null
}

/** Summary for the admin: who came back, how far they read, which parts held their attention, what they clicked. */
export function offerStats(rows: VisitRow[], sectionOrder: string[] = []): OfferStats {
  const n = rows.length
  const byVisitor = new Map<string, number>()
  for (const r of rows) byVisitor.set(r.visitorId, (byVisitor.get(r.visitorId) ?? 0) + 1)
  const seen = new Map<string, { visits: number; ms: number }>()
  const labels = new Map<string, number>()
  const devices: Record<string, number> = {}
  for (const r of rows) {
    devices[r.device] = (devices[r.device] ?? 0) + 1
    for (const [id, ms] of Object.entries(asSections(r.sections))) {
      if (ms < 2000) continue
      const e = seen.get(id) ?? { visits: 0, ms: 0 }
      seen.set(id, { visits: e.visits + 1, ms: e.ms + ms })
    }
    for (const c of asClicks(r.clicks)) if (c.l) labels.set(c.l, (labels.get(c.l) ?? 0) + 1)
  }
  const rank = (id: string): number => {
    const i = sectionOrder.findIndex((s) => id === s || id.startsWith(`${s}-`))
    return i < 0 ? 999 : i
  }
  const pct = (k: number): number => (n ? Math.round((k / n) * 100) : 0)
  return {
    visits: n,
    visitors: byVisitor.size,
    returning: [...byVisitor.values()].filter((k) => k > 1).length,
    avgSeconds: n ? Math.round(rows.reduce((s, r) => s + r.durationMs, 0) / n / 1000) : 0,
    avgScroll: n ? Math.round(rows.reduce((s, r) => s + r.maxScrollPct, 0) / n) : 0,
    reach: [25, 50, 75, 100].map((at) => ({ at, pct: pct(rows.filter((r) => r.maxScrollPct >= (at === 100 ? 98 : at)).length) })),
    sections: [...seen.entries()]
      .map(([id, e]) => ({ id, seenPct: pct(e.visits), avgSeconds: Math.round(e.ms / e.visits / 1000) }))
      .sort((a, b) => rank(a.id) - rank(b.id) || b.seenPct - a.seenPct),
    topClicks: [...labels.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8),
    devices,
    lastVisit: rows.reduce<Date | null>((m, r) => (!m || r.startedAt > m ? r.startedAt : m), null),
  }
}

/** Friendly names for the offer page's sections (screens-2 etc. fold into "Screens"). */
export const SECTION_ORDER = ['page', 'overview', 'screens', 'flow', 'solution', 'architecture', 'gallery', 'modules', 'phases', 'decisions', 'sign']
export function sectionLabel(id: string): string {
  if (id === 'screens' || id.startsWith('flow-')) return id === 'screens' ? 'Screens' : `Screens · ${id.slice(5)}`
  return (
    { page: 'Top & other', overview: 'Intro', solution: 'The need & the system', architecture: 'How it connects', gallery: 'Gallery', modules: 'Modules & prices', phases: 'Timeline', decisions: 'Decisions', sign: 'Sign' } as Record<string, string>
  )[id] ?? id
}

/** Heatmap points for one device class, compact ([sectionIndex, x, y]) and evenly thinned to at most `max`. */
export function heatPoints(lists: { s: string; x: number; y: number }[][], max: number): { sections: string[]; points: [number, number, number][] } {
  const all = lists.flat()
  const step = all.length > max ? all.length / max : 1
  const sections: string[] = []
  const index = new Map<string, number>()
  const points: [number, number, number][] = []
  const take = Math.min(all.length, max)
  for (let j = 0; j < take; j++) {
    // evenly spread, with a golden-ratio jitter inside each stride so regular patterns are not skipped
    const p = all[Math.min(all.length - 1, Math.floor((j + ((j * 0.618_034) % 1)) * step))]!
    let k = index.get(p.s)
    if (k === undefined) {
      k = sections.push(p.s) - 1
      index.set(p.s, k)
    }
    points.push([k, p.x, p.y])
  }
  return { sections, points }
}
