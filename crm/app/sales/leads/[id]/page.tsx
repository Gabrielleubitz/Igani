import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AddNoteForm, AddTaskForm, CompleteTaskButton, LogTouchButtons } from '@/components/crm/LeadNotesTasks'
import { foldTasks, leadScore, scoreLabel, staleDays } from '@/components/crm/crm-utils'
import { EditContactForm } from '@/components/crm/EditContactForm'
import { LeadControls } from '@/components/LeadControls'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { formatDateTime, leadName } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Lead' }

const LABELS: Record<string, string> = {
  'note.added': 'Note',
  'task.created': 'Task created',
  'task.completed': 'Task completed',
  'touch.logged': 'Touch',
}

export default async function LeadPage({ params }: { params: { id: string } }): Promise<React.ReactElement> {
  const user = await requireUser()
  const isAdmin = user.role === 'ADMIN'
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: { assignedTo: { select: { name: true, email: true } }, bookings: { orderBy: { startTime: 'desc' }, take: 10 } },
  })
  if (!lead) notFound()
  if (!isAdmin && lead.assignedToId && lead.assignedToId !== user.id) notFound()

  const [logs, reps, me] = await Promise.all([
    prisma.activityLog.findMany({
      where: { entityType: 'LEAD', entityId: lead.id },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.user.findMany({ where: { role: { in: ['SALES', 'ADMIN'] } }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true } }),
  ])
  const tz = me.timeZone
  const tasks = foldTasks(logs).sort((a, b) => Number(a.done) - Number(b.done) || (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity))
  const score = leadScore(lead)
  const lastTouch = logs.find((l) => l.actor !== null || l.action === 'note.added')?.createdAt ?? lead.createdAt
  const stale = staleDays(lead.status, lastTouch)
  const canEdit = true // contacts are open to every authenticated role

  const describe = (l: (typeof logs)[number]): string => {
    const m = (l.metadata ?? {}) as Record<string, unknown>
    if (l.action === 'note.added') return String(m.body ?? '')
    if (l.action === 'task.created') return String(m.title ?? '')
    if (l.action === 'touch.logged') return `${String(m.kind ?? '')}${m.summary ? ` — ${String(m.summary)}` : ''}`
    const rest = Object.entries(m).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    return rest.join(' · ')
  }

  return (
    <div className="space-y-6">
      <Link href="/sales/leads" className="text-sm text-muted-foreground underline underline-offset-4">
        ← Contacts
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{leadName(lead)}</h1>
          <p className="text-sm text-muted-foreground">
            {[lead.company, lead.email, lead.phone].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={score >= 65 ? 'default' : 'secondary'}>
              {scoreLabel(score)} · {score}
            </Badge>
            {stale !== null ? <Badge variant="outline">No contact for {stale} days</Badge> : null}
            <a href={`mailto:${lead.email}`} className="underline underline-offset-4">
              Email
            </a>
            {lead.phone ? (
              <a href={`tel:${lead.phone}`} className="underline underline-offset-4">
                Call
              </a>
            ) : null}
          </div>
        </div>
        <LeadControls
          leadId={lead.id}
          status={lead.status}
          assignedToId={lead.assignedToId}
          currentUserId={user.id}
          isAdmin={isAdmin}
          reps={reps.map((r) => ({ id: r.id, label: r.name ?? r.email ?? r.id }))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {(
                [
                  ['Stage', lead.status.replace('_', ' ')],
                  ['Owner', lead.assignedTo ? (lead.assignedTo.name ?? lead.assignedTo.email) : 'Unassigned'],
                  ['Source', lead.source],
                  ['Campaign', lead.utmCampaign],
                  ['Budget', lead.budget],
                  ['Website', lead.website],
                  ['Created', formatDateTime(lead.createdAt, tz)],
                ] as [string, string | null][]
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-right">{v}</span>
                  </div>
                ))}
              {lead.message ? <p className="mt-3 whitespace-pre-wrap rounded-md border p-2 text-muted-foreground">{lead.message}</p> : null}
              <Link href={`/sales/invite?leadId=${lead.id}`} className="mt-3 block text-sm underline underline-offset-4">
                Send meeting invite →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <details>
            <summary className="cursor-pointer list-none p-6 text-lg font-semibold leading-none tracking-tight">Edit contact <span className="text-sm font-normal text-muted-foreground">(show)</span></summary>
            <CardContent>
              <EditContactForm
                key={lead.updatedAt.toISOString()}
                leadId={lead.id}
                initial={{ firstName: lead.firstName, lastName: lead.lastName, phone: lead.phone, company: lead.company, website: lead.website, budget: lead.budget, dealValue: lead.dealValue, tags: lead.tags }}
              />
            </CardContent>
            </details>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.length === 0 ? <p className="text-sm text-muted-foreground">No tasks yet.</p> : null}
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className={t.done ? 'text-muted-foreground line-through' : ''}>
                    {t.title} <span className="text-xs uppercase text-muted-foreground">{t.priority.toLowerCase()}</span>
                    {t.dueAt ? <div className="text-xs text-muted-foreground">due {formatDateTime(t.dueAt, tz)}</div> : null}
                  </div>
                  {!t.done && canEdit ? <CompleteTaskButton leadId={lead.id} taskId={t.id} /> : null}
                </div>
              ))}
              {canEdit ? <AddTaskForm leadId={lead.id} /> : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          {canEdit ? (
            <Card>
              <CardContent className="space-y-4 pt-6">
                <LogTouchButtons leadId={lead.id} />
                <AddNoteForm leadId={lead.id} />
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.bookings.map((b) => (
                <div key={b.id} className="border-l-2 pl-3 text-sm">
                  <Badge variant="outline">Meeting</Badge> {b.title} · {formatDateTime(b.startTime, tz)} · {b.status}
                </div>
              ))}
              {logs.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : null}
              {logs.map((l) => (
                <div key={l.id} className="border-l-2 pl-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={l.action === 'note.added' ? 'default' : 'secondary'}>{LABELS[l.action] ?? l.action}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {l.actor ? (l.actor.name ?? l.actor.email) : 'system'} · {formatDateTime(l.createdAt, tz)}
                    </span>
                  </div>
                  {describe(l) ? <p className="mt-1 whitespace-pre-wrap">{describe(l)}</p> : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
