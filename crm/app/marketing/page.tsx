import Link from 'next/link'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { STATUS_LABEL, LEAD_STATUSES } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Marketing' }
export const dynamic = 'force-dynamic'

const RANGES = [7, 30, 90, 365] as const

export default async function MarketingPage({ searchParams }: { searchParams: { days?: string } }): Promise<React.ReactElement> {
  await requireUser(['ADMIN', 'MARKETING'])
  const days = RANGES.find((d) => String(d) === searchParams.days) ?? 30
  const since = new Date(Date.now() - days * 864e5)
  const leads = await prisma.lead.findMany({ where: { createdAt: { gte: since } }, select: { utmSource: true, utmMedium: true, utmCampaign: true, source: true, status: true } })
  const group = (key: (l: (typeof leads)[number]) => string): { label: string; total: number; won: number; qualified: number }[] => {
    const m = new Map<string, { total: number; won: number; qualified: number }>()
    for (const l of leads) {
      const k = key(l)
      const e = m.get(k) ?? { total: 0, won: 0, qualified: 0 }
      e.total++
      if (l.status === 'WON') e.won++
      if (l.status === 'DEMO_SCHEDULED' || l.status === 'PROPOSAL_SENT' || l.status === 'WON') e.qualified++
      m.set(k, e)
    }
    return [...m].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.total - a.total).slice(0, 20)
  }
  const tables: [string, string, ReturnType<typeof group>][] = [
    ['Channel', 'Where the lead came from (form, booking page, import…)', group((l) => l.source)],
    ['UTM source', 'utm_source from the ad or link', group((l) => l.utmSource ?? '(direct / none)')],
    ['Campaign', 'utm_campaign', group((l) => l.utmCampaign ?? '(none)')],
  ]
  const byStatus = new Map<string, number>()
  for (const l of leads) byStatus.set(l.status, (byStatus.get(l.status) ?? 0) + 1)
  const qualified = leads.filter((l) => ['DEMO_SCHEDULED', 'PROPOSAL_SENT', 'WON'].includes(l.status)).length

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
                      <th className="pb-1 text-right font-normal" title="Reached demo, proposal or won">Mtg+</th>
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
