import { notFound } from 'next/navigation'
import { StraightLineChart } from '@/components/calls/StraightLineChart'
import { WeekLineCard } from '@/components/calls/WeekLineCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SAMPLE_LOST, SAMPLE_SHORT, SAMPLE_STRONG, sampleWeekCalls } from '@/lib/line-map-samples'
import { summarizeWeek } from '@/lib/straight-line-week'

export const metadata = { title: 'Straight Line preview', robots: { index: false, follow: false } }

/** Development preview of the Straight Line visuals with sample data. Not available in production. */
export default function Page(): React.ReactElement {
  if (process.env.NODE_ENV === 'production') notFound()
  const week = summarizeWeek(sampleWeekCalls())
  const lessons = { 6: { id: 'x', unlocked: true }, 7: { id: 'x', unlocked: true }, 8: { id: 'x', unlocked: false } }
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Straight Line visuals: preview with sample data</h1>
      {[
        ['A strong call (9:12)', SAMPLE_STRONG],
        ['A call that lost the line (7:30)', SAMPLE_LOST],
        ['A short call (1:10)', SAMPLE_SHORT],
      ].map(([title, s]) => {
        const sample = s as typeof SAMPLE_STRONG
        return (
          <Card key={title as string}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{title as string}</CardTitle>
            </CardHeader>
            <CardContent>
              <StraightLineChart map={sample.map} durationSec={sample.durationSec} />
            </CardContent>
          </Card>
        )
      })}
      <WeekLineCard title="Your week on the Straight Line" week={week} prevDiscipline={(week.discipline ?? 0) - 7} lessons={lessons} callHref={(id) => `/dev/straight-line#${id}`} />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Compact version (for lists of calls)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[SAMPLE_STRONG, SAMPLE_LOST, SAMPLE_SHORT].map((s, i) => (
            <div key={i} className="max-w-md rounded-lg border p-2">
              <StraightLineChart map={s.map} durationSec={s.durationSec} compact />
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  )
}
