import { LEAD_STATUSES, STATUS_LABEL } from '@/lib/format'
import { loadMarketing } from '@/lib/marketing'
import { fail, json, mobileUser } from '@/lib/mobile'

export const dynamic = 'force-dynamic'

/** Marketing numbers for the app: ?days=7|30|90|365. Admins and marketing only. */
export async function GET(req: Request): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  if (user.role !== 'ADMIN' && user.role !== 'MARKETING') return fail('You don’t have access to that.', 403)
  const days = [7, 30, 90, 365].find((d) => String(d) === new URL(req.url).searchParams.get('days')) ?? 30
  const { leads, tables, byStatus, qualified } = await loadMarketing(days)
  return json({
    days,
    leads: leads.length,
    qualified,
    won: byStatus.get('WON') ?? 0,
    tables: tables.map(([title, hint, rows]) => ({ title, hint, rows })),
    funnel: LEAD_STATUSES.map((s) => ({ key: s, label: STATUS_LABEL[s], count: byStatus.get(s) ?? 0 })),
  })
}
