import { GRADIENT, STAGE_TONE, Tag } from '@/components/ui/tone'
import { CatchUp } from '@/components/crm/lead/CatchUp'
import { LeadActivities } from '@/components/crm/lead/LeadActivities'
import { QuickActions } from '@/components/crm/lead/QuickActions'
import { Section } from '@/components/crm/lead/Section'
import { CopyButton } from '@/components/ui/copy-button'
import { challengesFrom, insightBullets, interactionSplit, sentimentFrom, type CallRead } from '@/lib/lead-catchup'
import { buildTimeline } from '@/lib/lead-timeline'
import { cn } from '@/lib/utils'
import { aiTidyEnabled } from '@/lib/meeting-ai'
import { organizedFor } from '@/lib/organize-notes'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CallLink } from '@/components/dialer/Dialer'
import { formatPhone } from '@/lib/phone-numbers'
import { notFound } from 'next/navigation'
import { leadScore, scoreLabel, staleDays } from '@/components/crm/crm-utils'
import { BriefMeButton } from '@/components/crm/BriefMeButton'
import { EditLeadButton } from '@/components/crm/EditLeadButton'
import { EmailsPanel, type EmailView } from '@/components/crm/EmailsPanel'
import { googleGrants } from '@/lib/google'
import { MeetConnectBanner, MeetingCall, MeetingSyncTrigger, type MeetingCallView } from '@/components/crm/MeetingCall'
import { LeadDocuments } from '@/components/crm/LeadDocuments'
import { OFFER_STATUS_LABEL, OFFER_STATUS_TONE } from '@/lib/offer-admin'
import { offerScope } from '@/lib/offer-access'
import { AddTaskForm, TaskRow, type TaskView } from '@/components/crm/LeadNotesTasks'
import { StagePill } from '@/components/crm/StagePill'
import { AdminDealPanel, MyCommissionCard } from '@/components/crm/AdminDealPanel'
import { LeadControls } from '@/components/LeadControls'
import { LeadProfileCard } from '@/components/crm/LeadProfileCard'
import { readProfile } from '@/lib/lead-intel'
import { Badge } from '@/components/ui/badge'
import { requireUser } from '@/lib/auth'
import { appUrl } from '@/lib/env'
import { formatDateTime, formatMoney, leadName, timeAgo } from '@/lib/format'
import { recipientLabel } from '@/lib/email-labels'
import { canSeeLead } from '@/lib/lead-access'
import { dealTerms, parseTerms, salespersonCommissionView, statusOf, type CommissionBreakdown, type CommissionTerms } from '@/lib/commission'
import { termsLockedBy } from '@/lib/commission-lock'
import { termsForAssignee } from '@/lib/deals'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { foldTasksFromLogs } from '@/lib/task-view'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const params = await props.params;
  const user = await requireUser()
  const lead = await prisma.lead.findUnique({ where: { id: params.id }, select: { firstName: true, lastName: true, email: true, phone: true, assignedToId: true } })
  return { title: lead && canSeeLead(user, lead) ? leadName(lead) : 'Contact' }
}

const MONEY_EVENTS = ['lead.price_changed', 'lead.commission_overridden', 'lead.commission_recalculated', 'lead.commission_payment', 'lead.source_type_changed'] as const

// rebuilding a lead's profile reads several calls with AI
export const maxDuration = 300

export default async function LeadPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }): Promise<React.ReactElement> {
  const params = await props.params
  const tab = (await props.searchParams).tab === 'activities' ? 'activities' : 'catch-up'
  const user = await requireUser()
  const isAdmin = user.role === 'ADMIN'
  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: { assignedTo: { select: { name: true, email: true } }, sourcedBy: { select: { name: true, email: true } }, payments: { orderBy: { createdAt: 'asc' } }, bookings: { orderBy: { startTime: 'desc' }, take: 20, include: { host: { select: { name: true } }, meeting: true } } },
  })
  if (!lead || !canSeeLead(user, lead)) notFound()

  const [logs, people, me, threshold, myPage, emailRows, grants, leadCalls] = await Promise.all([
    prisma.activityLog.findMany({
      // Prices and commission are admin matters: those events never reach a salesperson's timeline.
      where: { entityType: 'LEAD', entityId: lead.id, ...(isAdmin ? {} : { action: { notIn: [...MONEY_EVENTS] } }) },
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.user.findMany({ where: { role: { not: null } }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: 'asc' } }),
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { timeZone: true, name: true } }),
    getSetting('leads.staleDays'),
    prisma.bookingPage.findFirst({ where: { active: true, hostId: user.id }, select: { slug: true } }),
    prisma.emailMessage.findMany({ where: { leadId: lead.id }, orderBy: { sentAt: 'desc' }, take: 100 }),
    googleGrants(user.id),
    prisma.call.findMany({ where: { leadId: lead.id, simulated: false }, orderBy: { startedAt: 'desc' }, take: 50, select: { id: true, startedAt: true, analysisStatus: true } }),
  ])
  const gmailConnected = grants.gmail
  const tz = me.timeZone
  const hostsMeetCalls = lead.bookings.some((b) => b.hostId === user.id && b.meetUrl)
  const timeOnly = (d: Date): string => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(d)
  const callView = (b: (typeof lead.bookings)[number]): MeetingCallView | null => {
    const m = b.meeting
    if (!m) return null
    return {
      bookingId: b.id,
      status: m.status,
      started: m.actualStart ? timeOnly(m.actualStart) : null,
      ended: m.actualEnd ? timeOnly(m.actualEnd) : null,
      minutes: m.actualStart && m.actualEnd ? Math.round((m.actualEnd.getTime() - m.actualStart.getTime()) / 60_000) : null,
      people: Array.isArray(m.participants) ? (m.participants as { name?: string }[]).map((p) => p.name ?? 'Guest') : [],
      notesStatus: m.notesStatus,
      docUrl: m.docUrl,
      summary: m.summaryText,
      nextSteps: m.nextStepsText,
      fullText: m.fullText,
      ...organizedFor(m),
      canTidy: aiTidyEnabled(),
      timesUnknown: m.lastError === 'meet-scope-missing',
    }
  }
  const anyPage = myPage ?? (await prisma.bookingPage.findFirst({ where: { active: true }, select: { slug: true }, orderBy: { createdAt: 'asc' } }))
  const nameOf = new Map(people.map((p) => [p.id, p.name ?? p.email ?? 'Teammate']))
  const reps = people.filter((p) => p.role !== null && (isAdmin || p.id === user.id)).map((r) => ({ id: r.id, label: r.name ?? r.email ?? r.id }))
  // Keep a former owner (left the team / role changed) selectable so the owner menu shows the truth.
  if (lead.assignedToId && !reps.some((r) => r.id === lead.assignedToId)) reps.unshift({ id: lead.assignedToId, label: `${lead.assignedTo?.name ?? lead.assignedTo?.email ?? 'Former teammate'} (no access)` })
  // Tasks: admins can hand work to anyone; everyone else to themselves or an admin.
  const teammates = people.filter((p) => p.role === 'ADMIN' || p.id === lead.assignedToId).map((p) => ({ id: p.id, label: p.name ?? p.email ?? p.id }))

  const { tasks, titles } = foldTasksFromLogs(logs)
  const now = new Date()
  const taskViews: TaskView[] = tasks
    .sort((a, b) => Number(a.done) - Number(b.done) || (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity))
    .map((t) => ({
      id: t.id,
      leadId: t.leadId,
      title: t.title,
      dueAt: t.dueAt?.toISOString() ?? null,
      dueLabel: t.dueAt ? formatDateTime(t.dueAt, tz) : null,
      priority: t.priority,
      assigneeId: t.assigneeId,
      assigneeLabel: t.assigneeId ? (t.assigneeId === user.id ? 'You' : (nameOf.get(t.assigneeId) ?? 'Former teammate')) : null,
      done: t.done,
      overdue: Boolean(t.dueAt && t.dueAt < now),
      auto: t.auto,
    }))
  const openTasks = taskViews.filter((t) => !t.done).length
  const score = leadScore(lead)
  const lastTouch = logs.find((l) => l.actor !== null)?.createdAt ?? lead.createdAt
  const stale = staleDays(lead.status, lastTouch, now, threshold)
  const canArchive = isAdmin || lead.assignedToId === user.id
  const upcoming = lead.bookings.filter((b) => b.status !== 'CANCELLED' && b.endTime >= now).reverse()
  const past = lead.bookings.filter((b) => !(b.status !== 'CANCELLED' && b.endTime >= now))

  const timeline = buildTimeline({
    logs,
    tasks: tasks.map((t) => ({ id: t.id, title: t.title, dueAt: t.dueAt, done: t.done })),
    bookings: lead.bookings.map((b) => ({ id: b.id, title: b.title, startTime: b.startTime, endTime: b.endTime, status: b.status, hostName: b.host.name })),
    now,
    ctx: { isAdmin, tz, nameOf, titles },
    me: user.id,
  })
  const unreadEmails = emailRows.filter((e) => e.direction === 'INBOUND' && !e.readAt).length
  const emails: EmailView[] = emailRows.map((e) => ({
    id: e.id,
    direction: e.direction,
    fromLabel: e.fromName ? `${e.fromName}` : e.fromEmail,
    // A message addressed to several clients is filed under each of them: show only THIS lead, never the other recipients.
    toLabel: recipientLabel({ email: lead.email, name: leadName(lead) }, e),
    subject: e.subject,
    snippet: e.snippet,
    body: e.bodyText,
    when: formatDateTime(e.sentAt, tz),
    ago: timeAgo(e.sentAt, now),
    unread: e.direction === 'INBOUND' && !e.readAt,
    via: e.externalId.startsWith('resend:') ? 'crm' : 'gmail',
    // our emails sent from the CRM: still waiting for their answer, or answered
    reply:
      e.direction !== 'OUTBOUND' || !e.externalId.startsWith('resend:')
        ? null
        : e.repliedAt
          ? { replied: true, label: `Replied ${timeAgo(e.repliedAt, now)}` }
          : { replied: false, label: e.followUpAt ? (e.followUpAt.getTime() > now.getTime() ? `Waiting for reply · reminder ${formatDateTime(e.followUpAt, tz)}` : 'No reply yet · follow up') : 'Waiting for reply' },
  }))

  // Archiving is personal: only whether *I* archived this lead matters here.
  const archivedByMe = (await prisma.leadArchive.findUnique({ where: { leadId_userId: { leadId: lead.id, userId: user.id } }, select: { leadId: true } })) !== null

  // Client documents: file bytes are never selected here, only the list.
  const docRows = await prisma.leadDocument.findMany({ where: { leadId: lead.id }, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, fileName: true, size: true, createdAt: true, uploadedById: true } })
  const uploaderNames = new Map(people.map((p) => [p.id, p.name ?? p.email ?? 'Teammate']))
  const documents = docRows.map((d) => ({ id: d.id, title: d.title, fileName: d.fileName, size: d.size, createdAt: d.createdAt.toISOString(), by: d.uploadedById ? (uploaderNames.get(d.uploadedById) ?? 'Former teammate') : d.title.startsWith('Signed agreement:') ? 'Client (signed online)' : 'Unknown', canDelete: isAdmin || d.uploadedById === user.id }))

  // Offers (admin-only feature for now)
  const offers = isAdmin ? await prisma.offer.findMany({ where: { leadId: lead.id, ...offerScope(user) }, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, slug: true, status: true, signedAt: true } }) : []

  // Money: admins get the full picture; the assigned salesperson gets only the commission amount, paid and pending.
  const adminDeal = isAdmin
    ? await (async () => {
        const saved = await termsForAssignee(lead.assignedToId)
        const snap = lead.commissionSnapshot as { terms?: unknown; breakdown?: CommissionBreakdown; snapshotAt?: string; overridden?: boolean } | null
        return {
          saved,
          terms: dealTerms(saved, lead.commissionOverrides),
          snapshot: snap?.breakdown ? { terms: parseTerms(snap.terms) as CommissionTerms, breakdown: snap.breakdown, at: snap.snapshotAt ?? null, overridden: Boolean(snap.overridden) } : null,
        }
      })()
    : null
  const myCommission =
    !isAdmin && lead.status === 'WON' && lead.commissionTotal !== null && lead.assignedToId === user.id ? salespersonCommissionView(statusOf(lead)) : null

  const facts: [string, React.ReactNode][] = (
    [
      ['Email', lead.email ? <a key="e" href={`mailto:${lead.email}`} className="break-all underline-offset-4 hover:underline">{lead.email}</a> : <span key="e" className="text-muted-foreground">No email yet</span>],
      ['Phone', lead.phone ? <CallLink key="p" phone={lead.phone} lead={{ id: lead.id, name: leadName(lead) }} className="underline-offset-4 hover:underline">{lead.phone}</CallLink> : null],
      ['Company', lead.company],
      ['Website', lead.website ? <a key="w" href={/^https?:\/\//.test(lead.website) ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="break-all underline-offset-4 hover:underline">{lead.website.replace(/^https?:\/\//, '')}</a> : null],
      ['Owner', lead.assignedTo ? (lead.assignedTo.name ?? lead.assignedTo.email) : 'Unassigned'],
      ['Sourced by', isAdmin && lead.sourcedBy ? `${lead.sourcedBy.name ?? lead.sourcedBy.email}: the lead stays theirs and can’t be reassigned` : null],
      ['Locked', isAdmin && !lead.sourcedBy && lead.assignedTo && (lead.status === 'SIGNED' || lead.status === 'WON') ? `${lead.assignedTo.name ?? lead.assignedTo.email} closed this deal: it stays theirs and can’t be reassigned` : null],
      ['Budget', lead.budget],
      ['Quoted price', isAdmin && lead.quotedPrice != null ? `₪${formatMoney(lead.quotedPrice)}` : null],
      ['Lost reason', lead.status === 'LOST' ? lead.lostReason : null],
      ['Came from', lead.source],
      ['Source detail', lead.sourceDetail],
      ['Campaign', [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(' / ') || null],
      ['Created', formatDateTime(lead.createdAt, tz)],
      ['Last touch', timeAgo(lastTouch, now)],
    ] as [string, React.ReactNode][]
  ).filter(([, v]) => v !== null && v !== '' && v !== undefined)

  // Catch-up: what the analysed calls said (only four fields, never the transcript). Marketing sees no call insights.
  const showCallInsights = user.role !== 'MARKETING'
  const callRows = showCallInsights
    ? await prisma.$queryRaw<{ sentiment: string | null; summary: string | null; nextStep: string | null; objections: unknown; startedAt: Date }[]>`
        SELECT analysis->>'sentiment' AS sentiment, analysis->>'summary' AS summary, analysis->>'nextStep' AS "nextStep", analysis->'objections' AS objections, "startedAt"
        FROM "Call" WHERE "leadId" = ${lead.id} AND simulated = false AND analysis IS NOT NULL ORDER BY "startedAt" DESC LIMIT 5`
    : []
  const reads: CallRead[] = callRows.map((r) => ({
    sentiment: r.sentiment === 'positive' || r.sentiment === 'neutral' || r.sentiment === 'negative' ? r.sentiment : null,
    summary: r.summary,
    nextStep: r.nextStep,
    objections: Array.isArray(r.objections) ? (r.objections as { objection?: unknown }[]).map((o) => (typeof o?.objection === 'string' ? o.objection : '')).filter(Boolean) : [],
    at: r.startedAt.toISOString(),
  }))
  const profile = user.role !== 'MARKETING' ? readProfile(lead.profile) : null
  const split = interactionSplit(timeline, now)
  const nextOpenTask = taskViews.find((t) => !t.done)
  const bullets = insightBullets({
    reads,
    nextTask: nextOpenTask ? { title: nextOpenTask.title, due: nextOpenTask.dueLabel } : null,
    nextMeeting: upcoming[0] ? { title: upcoming[0].title, when: formatDateTime(upcoming[0].startTime, tz) } : null,
    profileNeeds: profile?.lists.needs.map((n) => n.value) ?? [],
  })
  const challenges = challengesFrom(profile?.lists.pains.map((x) => x.value) ?? [], reads)
  const editProps = { leadId: lead.id, canEditEmail: isAdmin, initial: { email: lead.email, firstName: lead.firstName, lastName: lead.lastName, phone: lead.phone, company: lead.company, website: lead.website, budget: lead.budget, tags: lead.tags, source: lead.source, sourceDetail: lead.sourceDetail } }
  const roleLine = profile?.fields.role?.value ?? null
  const name = leadName(lead)

  const tabHref = (t: string): string => `/sales/leads/${lead.id}?tab=${t}`
  const tabs = [
    { id: 'catch-up', label: 'Catch-up' },
    { id: 'activities', label: 'Activities' },
  ]

  return (
    <div className="space-y-4">
      <Link href="/sales/leads" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← All contacts
      </Link>

      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] [&>*]:min-w-0">
        {/* The contact card */}
        <div className="order-1 lg:col-start-1 lg:row-start-1">
          <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div aria-hidden className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xl font-semibold text-white shadow-lg ring-1 ring-white/15 ${GRADIENT[STAGE_TONE[lead.status]]}`}>
                {(lead.firstName?.[0] ?? lead.email?.[0] ?? '?').toUpperCase()}
                {lead.lastName?.[0]?.toUpperCase() ?? ''}
              </div>
              <div className="min-w-0">
                <h1 className="break-words text-xl font-semibold leading-tight">{name}</h1>
                {[roleLine, lead.company].filter(Boolean).length ? <p className="mt-0.5 break-words text-sm text-muted-foreground">{[roleLine, lead.company].filter(Boolean).join(' at ')}</p> : null}
                {lead.email ? (
                  <p className="mt-1 flex items-center gap-1 text-sm">
                    <a href={`mailto:${lead.email}`} className="min-w-0 truncate text-primary underline-offset-4 hover:underline">
                      {lead.email}
                    </a>
                    <CopyButton text={lead.email} label="Copy" />
                  </p>
                ) : lead.phone ? (
                  <p className="mt-1 text-sm text-muted-foreground">{formatPhone(lead.phone)}</p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StagePill status={lead.status} />
              {lead.status !== 'WON' && lead.status !== 'LOST' ? (
                <span title="Heat score: how far along the deal is plus how complete the contact details are">
                  <Tag tone={score >= 65 ? 'rose' : score >= 35 ? 'amber' : 'sky'} className="text-xs">
                    {score >= 65 ? '🔥 ' : ''}
                    {scoreLabel(score)} · {score}
                  </Tag>
                </span>
              ) : null}
              {stale !== null ? <Tag tone="orange" className="text-xs">No contact for {stale} days</Tag> : null}
              {archivedByMe ? <Badge variant="outline">Archived (only for you)</Badge> : null}
              {unreadEmails ? <Tag tone="emerald" className="text-xs">{unreadEmails} new email{unreadEmails === 1 ? '' : 's'}</Tag> : null}
              {lead.tags.map((t) => (
                <Link key={t} href={`/sales/leads?tag=${encodeURIComponent(t)}`} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary ring-1 ring-primary/20 transition hover:bg-primary/20">
                  #{t}
                </Link>
              ))}
            </div>
            <QuickActions
              leadId={lead.id}
              name={name}
              email={lead.email}
              firstName={lead.firstName}
              company={lead.company}
              phone={lead.phone}
              senderName={me.name ?? user.email}
              bookingUrl={anyPage ? appUrl(`/book/${anyPage.slug}`) : null}
              canMeet={user.role !== 'MARKETING'}
              teammates={teammates}
              currentUserId={user.id}
              timeZone={tz}
              archived={archivedByMe}
              canArchive={canArchive && user.role !== 'MARKETING'}
              isAdmin={isAdmin}
              edit={editProps}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="order-2 space-y-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <nav aria-label="Contact views" className="flex gap-1 border-b">
            {tabs.map((t) => (
              <Link
                key={t.id}
                href={tabHref(t.id)}
                replace
                scroll={false}
                aria-current={tab === t.id ? 'page' : undefined}
                className={cn('-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors', tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}
              >
                {t.label}
              </Link>
            ))}
          </nav>
          {tab === 'catch-up' ? (
            <CatchUp
              bullets={bullets}
              profile={
                profile !== null || user.role !== 'MARKETING' ? (
                  <LeadProfileCard
                    leadId={lead.id}
                    profile={profile}
                    reviewedCalls={leadCalls.filter((c) => c.analysisStatus === 'ready').length}
                    callDates={Object.fromEntries(leadCalls.map((c) => [c.id, new Intl.DateTimeFormat('en-GB', { timeZone: me.timeZone, day: 'numeric', month: 'short' }).format(c.startedAt)]))}
                  />
                ) : null
              }
              brief={user.role !== 'MARKETING' ? <BriefMeButton leadId={lead.id} name={name} /> : null}
              inbound={split.inbound}
              outbound={split.outbound}
              status={split.status}
              sentiment={sentimentFrom(reads)}
              challenges={challenges}
              tz={tz}
              showCallInsights={showCallInsights}
            />
          ) : (
            <LeadActivities
              items={timeline}
              tz={tz}
              emailCount={emailRows.length}
              emails={
                <div id="emails">
                  <EmailsPanel
                    leadId={lead.id}
                    emails={emails}
                    gmailConnected={gmailConnected}
                    canMarkRead={!lead.assignedToId || lead.assignedToId === user.id}
                    composer={lead.email ? { email: lead.email, firstName: lead.firstName, company: lead.company, senderName: me.name ?? user.email } : null}
                  />
                </div>
              }
            />
          )}
        </div>

        {/* Key information and the rest of the sidebar */}
        <div className="order-3 space-y-4 lg:col-start-1 lg:row-start-2">
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Key information</h2>
              <EditLeadButton key={`c-${lead.updatedAt.toISOString()}`} variant="card" name={name} {...editProps} />
            </div>
            <div className="mb-3">
              <LeadControls leadId={lead.id} status={lead.status} quotedPrice={isAdmin ? lead.quotedPrice : null} assignedToId={lead.assignedToId} currentUserId={user.id} isAdmin={isAdmin} canClaim={false} reps={reps} wonCommission={isAdmin && lead.status === 'WON' ? lead.commissionTotal : null} commissionPaidOut={lead.finalPaidAt !== null} />
            </div>
            <dl className="space-y-2.5 text-sm">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 break-words">{v}</dd>
                </div>
              ))}
              {profile?.fields.location?.value ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Location</dt>
                  <dd className="break-words">{profile.fields.location.value}</dd>
                </div>
              ) : null}
            </dl>
            {lead.message ? (
              <div className="pt-3">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Their message</div>
                <p className="max-h-60 overflow-auto whitespace-pre-wrap rounded-md border bg-background/40 p-3 text-sm text-muted-foreground">{lead.message}</p>
              </div>
            ) : null}
          </div>

          {adminDeal ? (
            <AdminDealPanel
              key={`${lead.updatedAt.toISOString()}-${lead.commissionTotal ?? 0}`}
              leadId={lead.id}
              isWon={lead.status === 'WON'}
              quotedPrice={lead.quotedPrice}
              sourceType={lead.sourceType}
              salesperson={lead.assignedTo ? (lead.assignedTo.name ?? lead.assignedTo.email) : null}
              terms={adminDeal.terms}
              savedTerms={adminDeal.saved}
              overridden={lead.commissionOverrides !== null}
              snapshot={adminDeal.snapshot}
              payment={{
                finalPaymentReceivedAt: lead.finalPaymentReceivedAt?.toISOString() ?? null,
                finalPaidAt: lead.finalPaidAt?.toISOString() ?? null,
              }}
              termsLocked={(await termsLockedBy(lead.assignedTo?.email)) !== null}
              payments={lead.payments.map((x) => ({ id: x.id, amount: x.amount, receivedAt: x.receivedAt.toISOString(), commission: x.commission, commissionPaidAt: x.commissionPaidAt?.toISOString() ?? null, refundedAt: x.refundedAt?.toISOString() ?? null }))}
            />
          ) : null}
          {myCommission ? <MyCommissionCard {...myCommission} /> : null}

          <Section title="Tasks" count={openTasks ? `${openTasks} open` : null} defaultOpen={taskViews.length > 0}>
            <div className="space-y-3">
              {taskViews.length === 0 ? <p className="text-sm text-muted-foreground">No tasks yet. Add a follow-up so nothing slips.</p> : null}
              <div className="divide-y">
                {taskViews.map((t) => (
                  <TaskRow key={t.id} task={t} teammates={teammates} timeZone={tz} />
                ))}
              </div>
              <AddTaskForm leadId={lead.id} teammates={teammates} currentUserId={user.id} timeZone={tz} />
            </div>
          </Section>

          <Section title="Meetings" count={lead.bookings.length || null} defaultOpen={lead.bookings.length > 0}>
            <div className="space-y-3 text-sm">
              <MeetingSyncTrigger leadId={lead.id} everyMs={upcoming.some((b) => b.startTime.getTime() - now.getTime() < 15 * 60_000) ? 60_000 : 0} />
              {hostsMeetCalls && grants.connected && !(grants.meet && grants.docs) ? <MeetConnectBanner /> : null}
              {lead.bookings.length === 0 ? <p className="text-muted-foreground">No meetings yet.</p> : null}
              {[...upcoming, ...past].map((b) => {
                const call = callView(b)
                return (
                  <div key={b.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className={b.status === 'CANCELLED' ? 'text-muted-foreground line-through' : 'font-medium'}>{b.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(b.startTime, tz)} · {b.host.name ?? 'host'}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {b.meetUrl && b.status === 'CONFIRMED' && b.endTime >= now && call?.status !== 'ENDED' ? (
                          <a href={b.meetUrl} target="_blank" rel="noreferrer" className="text-xs text-primary underline-offset-4 hover:underline">
                            Join
                          </a>
                        ) : null}
                        {call?.status === 'LIVE' ? (
                          <Badge variant="success">Live now</Badge>
                        ) : call?.status === 'ENDED' ? (
                          <Badge variant="secondary">Held</Badge>
                        ) : call?.status === 'NOT_HELD' ? (
                          <Badge variant="outline">No-show</Badge>
                        ) : (
                          <Badge variant={b.status === 'CONFIRMED' ? (b.endTime < now ? 'secondary' : 'success') : b.status === 'PENDING' ? 'warning' : 'outline'}>
                            {b.status === 'CONFIRMED' ? (b.endTime < now ? 'Held' : 'Confirmed') : b.status === 'PENDING' ? 'Awaiting guest' : 'Cancelled'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {call ? <MeetingCall m={call} /> : null}
                  </div>
                )
              })}
            </div>
          </Section>

          <Section title="Documents" count={documents.length || null} defaultOpen={documents.length > 0}>
            <LeadDocuments leadId={lead.id} documents={documents} />
          </Section>

          {isAdmin ? (
            <Section
              title="Offers"
              count={offers.length || null}
              defaultOpen={offers.length > 0}
              action={
                <Link href={`/admin/offers?lead=${lead.id}`} className="text-sm font-normal text-primary hover:underline">
                  + New offer
                </Link>
              }
            >
              <div className="space-y-2 text-sm">
                {offers.length === 0 ? <p className="text-muted-foreground">No offers yet.</p> : null}
                {offers.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3">
                    <Link href={`/admin/offers/${o.id}`} className="truncate hover:underline">
                      {o.title}
                    </Link>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${OFFER_STATUS_TONE[o.status]}`}>{OFFER_STATUS_LABEL[o.status]}</span>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
