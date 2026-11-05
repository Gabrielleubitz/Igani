import { PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { STAGE_HINT, STAGE_LABEL, STAGE_LESSON } from '@/lib/line-map'
import { EPISODE_TITLES, mmss } from '@/lib/straight-line'
import type { WeekSummary } from '@/lib/straight-line-week'
import { cn } from '@/lib/utils'

export type LessonLinks = Record<number, { id: string; unlocked: boolean } | undefined>

const tone = (score: number | null): string => (score === null ? 'bg-muted' : score >= 70 ? 'bg-emerald-400' : score >= 45 ? 'bg-amber-400' : 'bg-rose-400')

/** A rep's week on the Straight Line: how strong each stage was, where they slip, and what to work on. Used on Today and in the admin's per-rep view. */
export function WeekLineCard({ title, week, prevDiscipline, lessons, callHref }: { title: string; week: WeekSummary; prevDiscipline?: number | null; lessons: LessonLinks; callHref?: (callId: string, at: number | null) => string }): React.ReactElement {
  if (week.calls === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">No analysed calls this week yet. After each recorded call, the Straight Line review lands here.</CardContent>
      </Card>
    )
  }
  const focus = week.focus
  const lesson = focus ? STAGE_LESSON[focus] : null
  const link = lesson ? lessons[lesson.ep] : undefined
  const trend = week.discipline !== null && prevDiscipline != null ? week.discipline - prevDiscipline : null
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {week.calls} {week.calls === 1 ? 'call' : 'calls'} analysed this week · the coach’s read of each call
        </p>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">On the line</div>
            <div className="text-2xl font-semibold tabular-nums">{week.discipline ?? '–'}%</div>
            {trend !== null ? <div className={cn('text-[11px]', trend >= 0 ? 'text-emerald-400' : 'text-rose-400')}>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend)} pts vs last week</div> : <div className="text-[11px] text-muted-foreground">time between the boundaries</div>}
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Action threshold</div>
            <div className="text-2xl font-semibold tabular-nums">{week.threshold ? `${week.threshold.avgPeak}/10` : '–'}</div>
            <div className="text-[11px] text-muted-foreground">{week.threshold ? `reached on ${week.threshold.crossed} of ${week.threshold.of} calls` : 'average readiness peak'}</div>
          </div>
          <div className="col-span-2 rounded-lg border p-3 sm:col-span-1">
            <div className="text-xs text-muted-foreground">Weakest stage</div>
            <div className="text-2xl font-semibold">{focus ? STAGE_LABEL[focus] : '–'}</div>
            <div className="text-[11px] text-muted-foreground">{focus ? STAGE_HINT[focus] : 'needs a few more calls'}</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your milestones, averaged</div>
          {week.stages.map((s) => (
            <div key={s.key} className="grid grid-cols-[92px_1fr_44px] items-center gap-3" title={STAGE_HINT[s.key]}>
              <span className={cn('text-xs', s.key === focus && 'font-semibold text-foreground')}>{STAGE_LABEL[s.key]}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-muted">
                <span className={cn('block h-full rounded-full', tone(s.score))} style={{ width: `${s.score ?? 0}%` }} />
              </span>
              <span className="text-end text-xs tabular-nums text-muted-foreground">{s.score === null ? '–' : `${s.score}%`}</span>
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">Each bar counts only the calls that reached that stage. Green 70+, amber 45 to 69, red below.</p>
        </div>

        {week.slips.length ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Where it slipped most</div>
            <ol className="space-y-2">
              {week.slips.map((s, i) => (
                <li key={`${s.key}-${s.kind}`} className="rounded-lg border px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">
                      {i + 1}. {s.label}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">{s.calls} {s.calls === 1 ? 'call' : 'calls'}</span>
                  </div>
                  {s.examples.map((e) => (
                    <div key={e.callId} className="mt-0.5 text-xs text-muted-foreground">
                      {callHref ? (
                        <Link href={callHref(e.callId, e.at)} className="underline-offset-2 hover:underline">
                          {e.at != null ? `at ${mmss(e.at)}` : 'open the call'}
                        </Link>
                      ) : e.at != null ? (
                        `at ${mmss(e.at)}`
                      ) : null}
                      {e.note ? `: ${e.note}` : ''}
                    </div>
                  ))}
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-sm text-emerald-400">No slips recorded this week. Keep it on the line.</p>
        )}

        {focus && lesson ? (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-primary">Focus this week: the {STAGE_LABEL[focus].toLowerCase()}</div>
            <p className="mt-1 text-sm text-muted-foreground">{STAGE_HINT[focus]}</p>
            {link?.unlocked ? (
              <Link href={`/sales/videos?v=${link.id}&t=${lesson.startSec}`} className="mt-2 inline-flex items-center gap-2 font-medium hover:underline">
                <PlayCircle className="h-4 w-4 text-primary" aria-hidden /> Episode {lesson.ep}: {EPISODE_TITLES[lesson.ep]} at {mmss(lesson.startSec)}
              </Link>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Episode {lesson.ep}: {EPISODE_TITLES[lesson.ep]} {link ? '(finish the earlier episodes first)' : ''}</p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
