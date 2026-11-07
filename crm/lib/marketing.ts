import 'server-only'
import { prisma } from './prisma'

/** The Marketing page's numbers for the last `days` days: shared by the website and the iOS app. */
export async function loadMarketing(days: number) {
  const since = new Date(Date.now() - days * 864e5)
  const rows = await prisma.lead.findMany({ where: { createdAt: { gte: since } }, select: { id: true, utmSource: true, utmMedium: true, utmCampaign: true, source: true, status: true } })
  // "Reached a meeting" counts leads that EVER got to demo/proposal/won (a demo that ended in Lost still counts), or had a booking.
  const ids = rows.map((r) => r.id)
  const [progressed, booked] = await Promise.all([
    prisma.activityLog.findMany({
      where: { entityType: 'LEAD', entityId: { in: ids }, action: 'lead.status_changed', OR: ['DEMO_SCHEDULED', 'DEMO_SENT', 'PROPOSAL_SENT', 'SIGNED', 'WON'].map((to) => ({ metadata: { path: ['to'], equals: to } })) },
      select: { entityId: true },
      distinct: ['entityId'],
    }),
    prisma.booking.findMany({ where: { leadId: { in: ids }, status: { not: 'CANCELLED' } }, select: { leadId: true }, distinct: ['leadId'] }),
  ])
  const reached = new Set([...progressed.map((p) => p.entityId), ...booked.map((b) => b.leadId!), ...rows.filter((r) => ['DEMO_SCHEDULED', 'DEMO_SENT', 'PROPOSAL_SENT', 'SIGNED', 'WON'].includes(r.status)).map((r) => r.id)])
  const leads = rows.map((r) => ({ ...r, reached: reached.has(r.id) }))
  const group = (key: (l: (typeof leads)[number]) => string): { label: string; total: number; won: number; qualified: number }[] => {
    const m = new Map<string, { total: number; won: number; qualified: number }>()
    for (const l of leads) {
      const k = key(l)
      const e = m.get(k) ?? { total: 0, won: 0, qualified: 0 }
      e.total++
      if (l.status === 'WON') e.won++
      if (l.reached) e.qualified++
      m.set(k, e)
    }
    return [...m].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.total - a.total).slice(0, 20)
  }
  const tables: [string, string, ReturnType<typeof group>][] = [
    ['Channel', 'Where the lead came from (form, booking page, import…)', group((l) => l.source)],
    ['UTM source', 'utm_source from the ad or link', group((l) => l.utmSource ?? '(direct / none)')],
    ['Campaign', 'utm_campaign', group((l) => l.utmCampaign ?? '(none)')],
  ]
  const byStatus = new Map<string, number>()
  for (const l of leads) byStatus.set(l.status, (byStatus.get(l.status) ?? 0) + 1)
  const qualified = leads.filter((l) => l.reached).length

  return { leads, tables, byStatus, qualified }
}
