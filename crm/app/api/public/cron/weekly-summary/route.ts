import { logActivity } from '@/lib/audit'
import { cronAuthorised } from '@/lib/cron-auth'
import { sendWeeklySummaryEmail } from '@/lib/email'
import { appUrl } from '@/lib/env'
import { formatMoney } from '@/lib/format'
import { formatPrice } from '@/lib/offer-modules'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { buildWeeklySummary, weekKey } from '@/lib/weekly-summary'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const fmtDay = (d: Date): string => new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', month: 'short', day: 'numeric' }).format(d)
const delta = (cur: number, prev: number): { sub: string; tone?: 'good' | 'bad' } =>
  prev === 0 ? { sub: cur ? 'new this week' : 'same as last week' } : cur === prev ? { sub: 'same as last week' } : { sub: `${cur > prev ? '+' : ''}${Math.round(((cur - prev) / prev) * 100)}% vs last week`, tone: cur > prev ? 'good' : 'bad' }

/**
 * Sunday-morning summary for every active admin (Vercel Cron, see vercel.json). Sent once per ISO week: a second run
 * in the same week does nothing. `?dry=1` returns the numbers without emailing (for checking the job by hand).
 */
export async function GET(req: Request): Promise<Response> {
  if (!cronAuthorised(req)) return new Response('Unauthorized', { status: 401 })
  const now = new Date()
  const week = weekKey(now)
  const dry = new URL(req.url).searchParams.get('dry') === '1'
  if (!dry && !(await getSetting('notifications.weeklySummary'))) return Response.json({ ok: true, skipped: 'turned off in Settings' })
  // Claim the week before sending (the settings table's key is unique, so two overlapping runs can't both win).
  // A run that already sent to some admins records them; a later run only retries the ones still missing.
  const lockKey = `weekly-summary:${week}`
  type Lock = { sent: string[] }
  let already: string[] = []
  if (!dry) {
    const claimed = await prisma.siteSetting.create({ data: { key: lockKey, value: { sent: [] } } }).then(() => true).catch(() => false)
    if (!claimed) {
      const prev = await prisma.siteSetting.findUnique({ where: { key: lockKey } })
      already = ((prev?.value as Lock | null)?.sent ?? []).filter((e) => typeof e === 'string')
      // Another run touched it in the last 10 minutes (it may still be sending): leave it to that run.
      // After that, a run only retries the admins the earlier one didn't reach.
      if (prev && Date.now() - prev.updatedAt.getTime() < 10 * 60_000) return Response.json({ ok: true, skipped: `another run handled ${week} moments ago` })
    }
  }

  const s = await buildWeeklySummary(now, await getSetting('leads.staleDays'))
  if (dry) return Response.json({ ok: true, week, summary: s })

  const admins = await prisma.allowedUser.findMany({ where: { role: 'ADMIN', active: true }, select: { email: true } })
  const names = new Map((await prisma.user.findMany({ where: { email: { in: admins.map((a) => a.email) } }, select: { email: true, name: true } })).map((u) => [u.email, u.name]))
  const base = appUrl()
  const stats = [
    { label: 'New leads', value: String(s.newLeads), ...delta(s.newLeads, s.newLeadsPrev) },
    { label: 'Deals won', value: String(s.won.count), sub: s.won.value ? `₪${formatMoney(s.won.value)}` : undefined, tone: s.won.count ? ('good' as const) : undefined },
    { label: 'Meetings held', value: String(s.meetingsHeld) },
    { label: 'Open pipeline', value: `₪${formatMoney(s.pipelineValue)}`, sub: `${s.openDeals} open deal${s.openDeals === 1 ? '' : 's'}` },
  ]
  const props = {
    range: `${fmtDay(s.from)} – ${fmtDay(new Date(s.to.getTime() - 1))}`,
    stats,
    signed: s.signedOffers.map((o) => ({ title: o.title, client: o.client, total: formatPrice(o.total, o.currency) })),
    hotOffers: s.hotOffers.map((o) => ({
      title: o.title,
      client: o.client,
      detail: `${o.visits} visit${o.visits === 1 ? '' : 's'}${o.people > 1 ? ` by ${o.people} people` : ''} · read ${o.avgRead}% · last ${fmtDay(o.lastVisit)}`,
      url: `${base}/admin/offers/${o.id}#visits`,
    })),
    tasks: s.tasks,
    sources: s.topSources.map((x) => `${x.source} (${x.count})`).join(', '),
    quiet: s.quiet,
    dashboardUrl: `${base}/admin/dashboard`,
    tasksUrl: `${base}/sales/tasks?scope=all`,
    todayUrl: `${base}/sales/today`,
  }
  const subject = `Your week: ${s.newLeads} new lead${s.newLeads === 1 ? '' : 's'}, ${s.won.count} won${s.hotOffers.length ? `, ${s.hotOffers.length} offer${s.hotOffers.length === 1 ? '' : 's'} being read` : ''}`

  const sent: string[] = []
  const failed: string[] = []
  for (const a of admins) {
    if (already.includes(a.email)) continue
    try {
      await sendWeeklySummaryEmail(a.email, { ...props, name: names.get(a.email)?.split(' ')[0] || 'there' }, subject)
      sent.push(a.email)
      await prisma.siteSetting.update({ where: { key: lockKey }, data: { value: { sent: [...already, ...sent] } } })
    } catch (err) {
      console.error('[weekly-summary] send failed', a.email, err)
      failed.push(a.email)
    }
  }
  if (!sent.length && !failed.length) return Response.json({ ok: true, skipped: `already sent for ${week}` })
  if (sent.length) await logActivity({ entityType: 'SETTING', entityId: `weekly-summary:${week}`, action: 'summary.weekly_sent', metadata: { week, to: sent, failed } })
  return Response.json({ ok: true, week, sent: sent.length, failed: failed.length })
}
