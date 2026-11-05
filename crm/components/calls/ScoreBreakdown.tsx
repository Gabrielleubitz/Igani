import { ArrowUpRight, AudioLines, Gauge, MessagesSquare, ShieldAlert, Target, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { SeekButton } from '@/components/calls/CallView'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IconChip, Tag, type Tone } from '@/components/ui/tone'
import { scoreTone } from '@/lib/call-ui'
import { PACE_TARGET, TONALITY_DIMS, type CallScore, type Delivery, type ScorePart, type Tonality } from '@/lib/call-score'
import { cn } from '@/lib/utils'

const PART_LOOK: Record<ScorePart['key'], { icon: React.ReactElement; tone: Tone }> = {
  skills: { icon: <Target />, tone: 'blue' },
  tonality: { icon: <AudioLines />, tone: 'violet' },
  conversation: { icon: <MessagesSquare />, tone: 'cyan' },
  result: { icon: <Gauge />, tone: 'emerald' },
}

const bar = (score: number): string => (score >= 75 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-rose-400')

/** How the call score was built: each part, its weight, its score and the reason, plus what would lift it most. */
export function ScoreBreakdown({ score }: { score: CallScore }): React.ReactElement {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">How this score was built</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <ul className="space-y-3.5">
          {score.parts.map((p) => {
            const look = PART_LOOK[p.key]
            return (
              <li key={p.key} className="flex gap-3">
                <IconChip tone={look.tone} size="sm">
                  {look.icon}
                </IconChip>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">
                      {p.label} <span className="text-xs font-normal text-muted-foreground">· {Math.round(p.weight * 100)}% of the score</span>
                    </span>
                    <span className={cn('font-semibold tabular-nums', scoreTone(p.score).text)}>{p.score}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className={cn('block h-full rounded-full', bar(p.score))} style={{ width: `${Math.max(3, p.score)}%` }} />
                  </div>
                  <p dir="auto" className="mt-1.5 text-xs text-muted-foreground">
                    {p.why}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
        {score.capped ? (
          <p className="flex items-start gap-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-500/30">
            <ShieldAlert className="mt-px h-4 w-4 shrink-0" aria-hidden /> {score.capped}
          </p>
        ) : null}
        {score.lift ? (
          <p className="flex items-start gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs ring-1 ring-primary/30">
            <ArrowUpRight className="mt-px h-4 w-4 shrink-0 text-[hsl(var(--accent))]" aria-hidden />
            <span>
              <span className="font-semibold">Biggest lift next call: {score.lift.label.toLowerCase()}.</span> Bringing it to 90 would add about {Math.round((90 - score.lift.score) * score.lift.weight)} points.
            </span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

const MOOD: Record<NonNullable<Tonality['clientMood']>, { label: string; icon: React.ReactElement; tone: Tone }> = {
  warming: { label: 'Client warmed up', icon: <TrendingUp className="mr-1 h-3 w-3" />, tone: 'emerald' },
  steady: { label: 'Client stayed steady', icon: <Minus className="mr-1 h-3 w-3" />, tone: 'slate' },
  cooling: { label: 'Client cooled off', icon: <TrendingDown className="mr-1 h-3 w-3" />, tone: 'rose' },
}

const mmss = (sec: number): string => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

/** How the rep sounded: graded by a model that listened to the recording, with the measured pace and filler words. */
export function TonalityCard({ tonality, delivery, lang }: { tonality: Tonality | null | undefined; delivery: Delivery | null | undefined; lang?: 'he' | 'en' | 'mixed' }): React.ReactElement | null {
  const dims = tonality ? TONALITY_DIMS.filter((d) => typeof tonality.dims[d.key] === 'number') : []
  if (!dims.length && !delivery) return null
  const pace = lang === 'en' ? PACE_TARGET.en : PACE_TARGET.he
  const paceOk = delivery ? delivery.repWpm >= pace.low && delivery.repWpm <= pace.high : true
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AudioLines className="h-4 w-4 text-violet-300" aria-hidden /> Tonality
        </CardTitle>
        {tonality?.clientMood ? (
          <Tag tone={MOOD[tonality.clientMood].tone}>
            {MOOD[tonality.clientMood].icon}
            {MOOD[tonality.clientMood].label}
          </Tag>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {tonality?.summary ? (
          <p dir="auto" className="leading-relaxed">
            {tonality.summary}
          </p>
        ) : !dims.length ? (
          <p className="text-xs text-muted-foreground">The voice wasn’t judged on this call (analyze it again to listen to the recording). Pace is measured from the transcript.</p>
        ) : null}
        {dims.length ? (
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {dims.map((d) => {
              const v = tonality!.dims[d.key] as number
              return (
                <div key={d.key} title={d.hint}>
                  <div className="flex justify-between text-xs">
                    <span>{d.label}</span>
                    <span className="tabular-nums text-muted-foreground">{v}/5</span>
                  </div>
                  <div className="mt-1 flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={cn('h-1.5 flex-1 rounded-full', n <= v ? (v >= 4 ? 'bg-emerald-400' : v === 3 ? 'bg-amber-400' : 'bg-rose-400') : 'bg-muted')} />
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{d.hint}</p>
                </div>
              )
            })}
          </div>
        ) : null}
        {delivery ? (
          <div className="grid grid-cols-2 gap-3 border-t pt-3 text-xs">
            <div>
              <div className="text-muted-foreground">Pace</div>
              <div className={cn('mt-0.5 text-base font-semibold tabular-nums', paceOk ? 'text-emerald-300' : 'text-amber-300')}>{delivery.repWpm} words/min</div>
              <div className="text-[10px] text-muted-foreground">
                comfortable: {pace.low}–{pace.high} {lang === 'en' ? '' : '(Hebrew)'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Filler words</div>
              <div className={cn('mt-0.5 text-base font-semibold tabular-nums', delivery.fillersPerMin <= 3 ? 'text-emerald-300' : 'text-amber-300')}>{delivery.fillersPerMin}/min</div>
              <div dir="auto" className="text-[10px] text-muted-foreground">
                {delivery.fillers.length ? `mostly “${delivery.fillers.join('”, “')}”` : 'at least; transcripts drop some'}
              </div>
            </div>
          </div>
        ) : null}
        {tonality?.moments.length ? (
          <ul className="space-y-2.5 border-t pt-3">
            {tonality.moments.map((m, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="shrink-0 pt-px">{m.at != null ? <SeekButton at={m.at} label={mmss(m.at)} /> : null}</span>
                <span dir="auto" className="min-w-0">
                  {m.note}
                  {m.tryThis ? <span className="mt-0.5 block text-xs text-[hsl(var(--accent))]">Try: {m.tryThis}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {tonality?.coveredSec ? <p className="text-[11px] text-muted-foreground">Judged on the first {mmss(tonality.coveredSec)} of the call.</p> : null}
      </CardContent>
    </Card>
  )
}
