import { CheckCircle2, CircleDashed, PlayCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CallAnalysis } from '@/lib/call-analysis'
import { scoreTone } from '@/lib/call-ui'
import { EPISODE_TITLES, STRAIGHT_LINE_CHECKS, mmss } from '@/lib/straight-line'

type SL = NonNullable<CallAnalysis['straightLine']>

const SKILLS: { key: keyof SL['scores']; label: string }[] = [
  { key: 'rapport', label: 'Rapport' },
  { key: 'intelligence', label: 'Questions' },
  { key: 'control', label: 'Control' },
  { key: 'threeTens', label: 'Three tens' },
  { key: 'looping', label: 'Looping' },
  { key: 'closing', label: 'Closing' },
]

/** The call scored against control of the call course, with links to the lesson (and minute) that teaches each weak point. */
export function StraightLinePanel({ sl, lessons }: { sl: SL; lessons: Record<number, { id: string; unlocked: boolean } | undefined> }): React.ReactElement {
  const scored = SKILLS.filter((s) => sl.scores[s.key] !== null)
  const checks = sl.checks.map((c) => ({ ...c, label: STRAIGHT_LINE_CHECKS.find((x) => x.id === c.id)?.label ?? c.id })).filter((c) => c.result !== 'na')
  if (!scored.length && !checks.length) return <></>
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Control of the call</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 text-sm">
        {scored.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {scored.map((s) => {
              const v = sl.scores[s.key] as number
              const t = scoreTone(v * 20)
              return (
                <div key={s.key} className={`rounded-lg px-3 py-2 ring-1 ${t.bg} ${t.ring}`}>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className={`text-lg font-semibold ${t.text}`}>{v}/5</div>
                  {sl.why?.[s.key] ? (
                    <p dir="auto" className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {sl.why[s.key]}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        ) : null}

        {checks.length ? (
          <ul className="space-y-1.5">
            {checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                {c.result === 'yes' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden />}
                <span>
                  {c.label}
                  {c.evidence ? <span className="block text-xs text-muted-foreground">“{c.evidence}”</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {sl.lessons.length ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Watch next</div>
            {sl.lessons.map((l) => {
              const video = lessons[l.ep]
              const title = `Episode ${l.ep}: ${EPISODE_TITLES[l.ep] ?? ''}`
              return (
                <div key={`${l.ep}-${l.startSec}`} className="rounded-lg border px-3 py-2">
                  {video?.unlocked ? (
                    <Link href={`/sales/videos?v=${video.id}&t=${l.startSec}`} className="flex items-center gap-2 font-medium hover:underline">
                      <PlayCircle className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      {title} at {mmss(l.startSec)}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CircleDashed className="h-4 w-4 shrink-0" aria-hidden />
                      {title} {video ? `(finish episode ${Math.max(1, l.ep - 1)} first)` : ''}
                    </div>
                  )}
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {l.topic}: {l.why}
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
