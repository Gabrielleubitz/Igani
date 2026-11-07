import { loadAnalytics } from '@/lib/analytics'
import { LEAD_STATUSES, STATUS_LABEL } from '@/lib/format'
import { json, mobileUser } from '@/lib/mobile'

export const dynamic = 'force-dynamic'

/** Analytics for the app (the website's numbers): ?scope=mine for an admin's own. */
export async function GET(req: Request): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const { mine, r, cur, prev, totalPipeline, commission, commissionDeals, last30, lostReasons } = await loadAnalytics(user, new URL(req.url).searchParams.get('scope') ?? undefined)
  const isAdmin = user.role === 'ADMIN'
  return json({
    isAdmin,
    mine,
    total: r.total,
    last30,
    won: r.byStatus.WON ?? 0,
    winRate: r.winRate === null ? null : Math.round(r.winRate * 100),
    pipeline: isAdmin ? totalPipeline : null,
    revenue30: isAdmin ? { now: cur.won, before: prev.won } : null,
    added30: isAdmin ? { now: cur.added, before: prev.added } : null,
    winRate30: { now: cur.winRate, before: prev.winRate },
    kept30: { now: cur.kept, before: prev.kept },
    commission: isAdmin ? null : { total: commission.total, paid: commission.paid, deals: commissionDeals },
    funnel: LEAD_STATUSES.map((s) => ({ key: s, label: STATUS_LABEL[s], count: r.byStatus[s] ?? 0 })),
    lost: lostReasons.map(([reason, count]) => ({ reason, count })),
    perDay: r.perDay,
    bySource: r.bySource.map((x) => ({ name: x.source, total: x.total, won: x.won })),
    byOwner: mine ? [] : r.byOwner.map((x) => ({ name: x.owner, total: x.total, won: x.won })),
  })
}
