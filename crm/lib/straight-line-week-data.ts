import 'server-only'
import type { LessonLinks } from '@/components/calls/WeekLineCard'
import { asAnalysis } from './call-analysis'
import { leadName } from './format'
import type { LineMap } from './line-map'
import { prisma } from './prisma'
import { splitWeeks, summarizeWeek, type WeekSummary } from './straight-line-week'
import { listVideos } from './video'
import { courseOrder } from './video-core'
import { unlockedFor } from './video-progress'

export interface RecentLineCall {
  id: string
  startedAt: Date
  durationSec: number
  who: string
  map: LineMap
}

/** One rep's week on control of the call (this week and the one before) from their analysed calls. */
export async function loadRepWeek(userId: string, now = new Date()): Promise<{ week: WeekSummary; prev: WeekSummary; recent: RecentLineCall[] }> {
  const since = new Date(now.getTime() - 14 * 86_400_000)
  const rows = await prisma.call.findMany({
    where: { userId, private: false, startedAt: { gt: since }, analysisStatus: 'ready' },
    orderBy: { startedAt: 'desc' },
    take: 300,
    select: { id: true, startedAt: true, durationSec: true, recordingSec: true, toNumber: true, analysis: true, lead: { select: { firstName: true, lastName: true, email: true, company: true } } },
  })
  const calls = rows.map((r) => ({ id: r.id, startedAt: r.startedAt, lineMap: asAnalysis(r.analysis)?.lineMap ?? null, row: r }))
  const { current, previous } = splitWeeks(calls, now)
  const recent: RecentLineCall[] = current
    .filter((c) => c.lineMap)
    .slice(0, 6)
    .map((c) => ({ id: c.id, startedAt: c.startedAt, durationSec: c.row.recordingSec ?? c.row.durationSec ?? 0, who: c.row.lead ? c.row.lead.company || leadName(c.row.lead) : c.row.toNumber, map: c.lineMap as LineMap }))
  return { week: summarizeWeek(current), prev: summarizeWeek(previous), recent }
}

/** Episode number -> the library video and whether this viewer has unlocked it (admins and marketing: everything). */
export async function lessonLinksFor(viewer: { id: string; role: string }): Promise<LessonLinks> {
  const course = courseOrder(await listVideos())
  const open = viewer.role === 'SALES' ? new Set((await unlockedFor(viewer.id)).unlocked) : null
  const out: LessonLinks = {}
  for (const v of course) {
    const n = Number(/^\s*(\d+)/.exec(v.title)?.[1])
    if (n) out[n] = { id: v.id, unlocked: open ? open.has(v.id) : true }
  }
  return out
}
