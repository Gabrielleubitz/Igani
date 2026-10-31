import Link from 'next/link'
import { CompleteTaskButton } from '@/components/crm/LeadNotesTasks'
import { foldTasks, leadScore, scoreLabel, staleDays, visibleLeadsWhere } from '@/components/crm/crm-utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { formatDateTime, leadName } from '@/lib/format'
import { prisma } from '@/lib/prisma'
import { PageIntro } from '@/components/PageIntro'

export const metadata = { title: 'Today' }

export default async function TodayPage(): Promise<React.ReactElement> {
  const user = await requireUser()
  const now = new Date()
  const endOfDay = new Date(now.getTime() + 864e5)
  const mine = user.role === 'ADMIN' ? {} : { assignedToId: user.id }
  const visible = await prisma.lead.findMany({ where: visibleLeadsWhere(user.role, user.id), select: { id: true } })
  const visibleIds = visible.map((l) => l.id)
  const [me, taskLogs, meetings, openLeads] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
    prisma.activityLog.findMany({ where: { entityType: 'LEAD', entityId: { in: visibleIds }, action: { in: ['task.created', 'task.completed'] } } }),
    prisma.booking.findMany({
      where: { status: 'CONFIRMED', startTime: { gte: now, lt: endOfDay }, ...(user.role === 'ADMIN' ? {} : { hostId: user.id }) },
      orderBy: { startTime: 'asc' },
      take: 20,
    }),
    prisma.lead.findMany({ where: { archived: false, status: { in: ['NEW', 'CONTACTED', 'DEMO_SCHEDULED', 'PROPOSAL_SENT'] }, ...mine }, take: 500 }),
  ])
  const tz = me.timeZone
  const tasks = foldTasks(taskLogs)
    .filter((t) => !t.done && t.dueAt && t.dueAt < endOfDay && (user.role === 'ADMIN' || t.assigneeId === user.id || t.assigneeId === null))
    .sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime())
  const taskLeads = await prisma.lead.findMany({
    where: { id: { in: [...new Set(tasks.map((t) => t.leadId))] } },
    select: { id: true, email: true, firstName: true, lastName: true },
  })
  const byId = new Map(taskLeads.map((l) => [l.id, l]))

  const touches = await prisma.activityLog.groupBy({
    by: ['entityId'],
    where: { entityType: 'LEAD', entityId: { in: openLeads.map((l) => l.id) }, actorId: { not: null } },
    _max: { createdAt: true },
  })
  const lastTouch = new Map(touches.map((t) => [t.entityId, t._max.createdAt]))
  const stale = openLeads
    .map((l) => ({ lead: l, days: staleDays(l.status, lastTouch.get(l.id) ?? l.createdAt, now), score: leadScore(l) }))
    .filter((x): x is { lead: (typeof openLeads)[number]; days: number; score: number } => x.days !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
  const hot = openLeads
    .map((l) => ({ lead: l, score: leadScore(l) }))
    .filter((x) => x.score >= 65)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)

  return (
    <div>
      <PageIntro title="Today" hint="Your daily starting point: what is due, who to call next, and which leads are hottest." className="mb-4" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks due &amp; overdue ({tasks.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 ? <p className="text-sm text-muted-foreground">Nothing due. Nice.</p> : null}
            {tasks.map((t) => {
              const l = byId.get(t.leadId)
              return (
                <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <div>
                    {t.title}{' '}
                    {t.dueAt! < now ? <Badge variant="outline">overdue</Badge> : null}
                    <div className="text-xs text-muted-foreground">
                      {l ? <Link href={`/sales/leads/${l.id}`} className="underline underline-offset-4">{leadName(l)}</Link> : null} · due {formatDateTime(t.dueAt!, tz)}
                    </div>
                  </div>
                  <CompleteTaskButton leadId={t.leadId} taskId={t.id} />
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meetings next 24h ({meetings.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {meetings.length === 0 ? <p className="text-sm text-muted-foreground">No meetings coming up.</p> : null}
            {meetings.map((b) => (
              <div key={b.id} className="text-sm">
                {b.title} · {b.guestName}
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(b.startTime, tz)}
                  {b.leadId ? (
                    <>
                      {' · '}
                      <Link href={`/sales/leads/${b.leadId}`} className="underline underline-offset-4">lead</Link>
                    </>
                  ) : null}
                  {b.meetUrl ? (
                    <>
                      {' · '}
                      <a href={b.meetUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">join</a>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Needs follow-up ({stale.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stale.length === 0 ? <p className="text-sm text-muted-foreground">Every open lead was touched recently.</p> : null}
            {stale.map(({ lead, days, score }) => (
              <div key={lead.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/sales/leads/${lead.id}`} className="underline underline-offset-4">{leadName(lead)}</Link>
                <span className="text-xs text-muted-foreground">
                  {lead.status.replace('_', ' ').toLowerCase()} · {days}d quiet · {scoreLabel(score)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hottest leads</CardTitle>
            <p className="text-xs text-muted-foreground">Score out of 100: how far along the deal is and how complete the contact details are.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {hot.length === 0 ? <p className="text-sm text-muted-foreground">No hot leads right now.</p> : null}
            {hot.map(({ lead, score }) => (
              <div key={lead.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/sales/leads/${lead.id}`} className="underline underline-offset-4">{leadName(lead)}</Link>
                <Badge>{score}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
