import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { conversionRate } from '@/lib/lead-query'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'

export const metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage(): Promise<React.ReactElement> {
  const staleDays = await getSetting('leads.staleDays')
  const now = new Date()
  const stale = new Date(now.getTime() - staleDays * 86_400_000)
  const dayEnd = new Date(now.getTime() + 86_400_000)
  const open = { archived: false, status: { notIn: ['WON', 'LOST'] as ('WON' | 'LOST')[] } }
  const [total, won, lost, unassigned, staleCount, newWeek, today, pendingApprovals, wonValue] = await Promise.all([
    prisma.lead.count({ where: { archived: false } }),
    prisma.lead.count({ where: { archived: false, status: 'WON' } }),
    prisma.lead.count({ where: { archived: false, status: 'LOST' } }),
    prisma.lead.count({ where: { ...open, assignedToId: null } }),
    prisma.lead.count({ where: { ...open, updatedAt: { lt: stale } } }),
    prisma.lead.count({ where: { archived: false, createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } }),
    prisma.booking.count({ where: { status: 'CONFIRMED', startTime: { gte: now, lt: dayEnd } } }),
    prisma.booking.count({ where: { status: 'PENDING' } }),
    prisma.lead.aggregate({ where: { archived: false, status: 'WON' }, _sum: { dealValue: true } }),
  ])
  const tiles: { label: string; value: string | number; href: string }[] = [
    { label: 'Total leads', value: total, href: '/admin/leads' },
    { label: 'New this week', value: newWeek, href: '/admin/leads' },
    { label: 'Unassigned open leads', value: unassigned, href: '/admin/leads?assignee=none' },
    { label: `Stale (> ${staleDays} days)`, value: staleCount, href: '/admin/leads' },
    { label: 'Won', value: won, href: '/admin/leads?status=WON' },
    { label: 'Lost', value: lost, href: '/admin/leads?status=LOST' },
    { label: 'Conversion rate', value: `${conversionRate(won, total)}%`, href: '/admin/leads' },
    { label: 'Won value', value: wonValue._sum.dealValue ?? 0, href: '/admin/leads?status=WON' },
    { label: 'Meetings next 24h', value: today, href: '/admin/bookings' },
    { label: 'Awaiting approval', value: pendingApprovals, href: '/admin/bookings' },
  ]
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card className="transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">{t.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-semibold">{t.value}</CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
