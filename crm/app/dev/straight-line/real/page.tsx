import { readFileSync } from 'node:fs'
import { notFound } from 'next/navigation'
import { StraightLineChart } from '@/components/calls/StraightLineChart'
import { StraightLinePanel } from '@/components/calls/StraightLinePanel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { scoreTone } from '@/lib/call-ui'
import { STAGE_LABEL, type LineMap } from '@/lib/line-map'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Straight Line: a real call (preview)', robots: { index: false, follow: false } }

/** Development only: shows a real call's analysis from a local JSON file (REAL_CALL_JSON or /tmp/call/analysis.json). The data file is never committed. */
export default function Page(): React.ReactElement {
  if (process.env.NODE_ENV === 'production') notFound()
  let a: Record<string, any>
  try {
    a = JSON.parse(readFileSync(process.env.REAL_CALL_JSON || '/tmp/call/analysis.json', 'utf8'))
  } catch {
    return <main className="p-8 text-sm text-muted-foreground">No analysis file found.</main>
  }
  const tone = scoreTone(a.overallScore)
  const lessons = { 2: { id: 'x', unlocked: true }, 6: { id: 'x', unlocked: true }, 7: { id: 'x', unlocked: true } }
  const mm = (s: number): string => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{a.call.who}</h1>
          <p className="text-sm text-muted-foreground">{a.call.type} · {mm(a.call.durationSec)} · analysed by the Straight Line</p>
        </div>
        <div className={cn('flex items-center gap-3 rounded-2xl px-4 py-3 ring-1', tone.bg, tone.ring)}>
          <div className={cn('text-4xl font-semibold tabular-nums', tone.text)}>{a.overallScore}</div>
          <div className="text-xs leading-tight text-muted-foreground">Straight Line score<br />out of 100</div>
        </div>
      </div>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Summary</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="leading-relaxed">{a.summary}</p>
          <div className="rounded-lg bg-primary/10 px-3 py-2 ring-1 ring-primary/30">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-primary">The Straight Line says</div>
            <p className="mt-0.5">{a.verdict}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">The call on the line</CardTitle></CardHeader>
        <CardContent><StraightLineChart map={a.lineMap as LineMap} durationSec={a.call.durationSec} /></CardContent>
      </Card>
      <StraightLinePanel sl={{ verdict: a.verdict, scores: a.scores, why: a.why, checks: a.checks, lessons: a.lessons }} lessons={lessons} />
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Where you left the line</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {a.moments.map((m: any, i: number) => (
            <div key={i} className="space-y-2 rounded-xl border p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md border px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">▶ {mm(m.at)}</span>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">{STAGE_LABEL[(m.step === 'threeTens' ? 'presentation' : m.step === 'intelligence' ? 'questions' : m.step === 'looping' ? 'loop' : m.step) as keyof typeof STAGE_LABEL] ?? m.step}</span>
              </div>
              <div><div className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">Client said</div><p>{m.clientSaid}</p></div>
              <div><div className="text-[11px] font-semibold uppercase tracking-wide text-primary">You said</div><p className="text-muted-foreground line-through decoration-rose-400/60">{m.repSaid}</p></div>
              <div className="rounded-lg bg-emerald-500/10 px-3 py-2 ring-1 ring-emerald-500/25"><div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">Try instead</div><p>{m.better}</p></div>
              <p className="text-xs text-muted-foreground">{m.why}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-5 md:grid-cols-2">
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">What went well</CardTitle></CardHeader><CardContent><ul className="list-disc space-y-2 pl-5 text-sm">{a.strengths.map((s: string) => <li key={s}>{s}</li>)}</ul></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-base">To work on</CardTitle></CardHeader><CardContent><ul className="list-disc space-y-2 pl-5 text-sm">{a.improvements.map((s: string) => <li key={s}>{s}</li>)}</ul></CardContent></Card>
      </div>
      <details className="rounded-xl border">
        <summary className="cursor-pointer px-4 py-3 text-sm text-muted-foreground">Transcript</summary>
        <div className="space-y-1 p-4 text-sm">{a.transcript.map((t: any, i: number) => <p key={i}><span className="mr-2 text-xs tabular-nums text-muted-foreground">{mm(t.start)}</span>{t.text}</p>)}</div>
      </details>
    </main>
  )
}
