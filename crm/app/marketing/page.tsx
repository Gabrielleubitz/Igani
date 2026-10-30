import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Marketing' }

export default async function MarketingPage(): Promise<React.ReactElement> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const [bySource, byCampaign, byStatus] = await Promise.all([
    prisma.lead.groupBy({ by: ['utmSource'], where: { createdAt: { gte: since } }, _count: { _all: true }, orderBy: { _count: { utmSource: 'desc' } } }),
    prisma.lead.groupBy({ by: ['utmCampaign'], where: { createdAt: { gte: since } }, _count: { _all: true }, orderBy: { _count: { utmCampaign: 'desc' } }, take: 20 }),
    prisma.lead.groupBy({ by: ['status'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
  ])
  const table = (rows: { label: string; count: number }[]): React.ReactElement => (
    <div className="divide-y text-sm">
      {rows.length === 0 ? <p className="text-muted-foreground">No leads yet.</p> : null}
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between py-1.5">
          <span>{r.label}</span>
          <span className="tabular-nums">{r.count}</span>
        </div>
      ))}
    </div>
  )
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Lead sources · last 30 days</h1>
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>UTM source</CardTitle></CardHeader>
          <CardContent>{table(bySource.map((r) => ({ label: r.utmSource ?? '(direct)', count: r._count._all })))}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Campaign</CardTitle></CardHeader>
          <CardContent>{table(byCampaign.map((r) => ({ label: r.utmCampaign ?? '(none)', count: r._count._all })))}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Stage</CardTitle></CardHeader>
          <CardContent>{table(byStatus.map((r) => ({ label: r.status, count: r._count._all })))}</CardContent>
        </Card>
      </div>
    </div>
  )
}
