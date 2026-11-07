import Link from 'next/link'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { STATUS_LABEL, LEAD_STATUSES } from '@/lib/format'
import { loadMarketing } from '@/lib/marketing'

export const metadata = { title: 'Marketing' }
export const dynamic = 'force-dynamic'

const RANGES = [7, 30, 90, 365] as const

export default async function MarketingPage(props: { searchParams: Promise<{ days?: string }> }): Promise<React.ReactElement> {
  const searchParams = await props.searchParams;
  await requireUser(['ADMIN', 'MARKETING'])
  const days = RANGES.find((d) => String(d) === searchParams.days) ?? 30
  const { leads, tables, byStatus, qualified } = await loadMarketing(days)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageIntro title="Marketing" hint="Which channels and campaigns bring leads, and which of those turn into meetings and wins." />
        <div className="flex gap-1">
          {RANGES.map((d) => (
            <Link key={d} href={`/marketing?days=${d}`} className={`rounded-full border px-3 py-1 text-sm ${d === days ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
              {d === 365 ? '1 year' : `${d} days`}
            </Link>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['New leads', leads.length],
          ['Reached a meeting+', qualified],
          ['Won', byStatus.get('WON') ?? 0],
          ['Lead → meeting rate', leads.length ? `${Math.round((qualified / leads.length) * 100)}%` : '—'],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border bg-card p-4">
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {tables.map(([title, hint, rows]) => (
          <Card key={title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-xs text-muted-foreground">{hint}</p>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? <p className="text-sm text-muted-foreground">No leads in this period.</p> : null}
              <table className="w-full text-sm">
                {rows.length ? (
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="pb-1 font-normal">Name</th>
                      <th className="pb-1 text-right font-normal">Leads</th>
                      <th className="pb-1 text-right font-normal" title="Ever reached a meeting, proposal or win">Mtg+</th>
                      <th className="pb-1 text-right font-normal">Won</th>
                    </tr>
                  </thead>
                ) : null}
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className="border-t">
                      <td className="max-w-[10rem] truncate py-1.5" title={r.label}>
                        {r.label}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">{r.total}</td>
                      <td className="py-1.5 text-right tabular-nums text-muted-foreground">{r.qualified}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.won}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Where these leads are now</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          {LEAD_STATUSES.map((s) => (
            <div key={s} className="rounded-md border px-3 py-2">
              <div className="text-lg font-semibold tabular-nums">{byStatus.get(s) ?? 0}</div>
              <div className="text-xs text-muted-foreground">{STATUS_LABEL[s]}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
