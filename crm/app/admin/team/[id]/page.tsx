import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AgreementsPanel } from '@/components/admin/AgreementsPanel'
import { CommissionTermsForm } from '@/components/admin/CommissionTermsForm'
import { TeamMemberForm } from '@/components/admin/TeamMemberForm'
import { PageIntro } from '@/components/PageIntro'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { formatDateTime, formatMoney, leadName, timeAgo } from '@/lib/format'
import { termsForAssignee } from '@/lib/deals'
import { prisma } from '@/lib/prisma'
import { isOpenTask } from '@/lib/team-metrics'
import { loadRepStats } from '@/lib/team-stats'
import { tasksForUser } from '@/lib/tasks'
import { STATUS_LABEL } from '@/lib/format'
import { StraightLineChart } from '@/components/calls/StraightLineChart'
import { TerminationForm } from '@/components/admin/TerminationForm'
import { PersonContractForm } from '@/components/admin/PersonContractForm'
import { CONTRACT_VERSION } from '@/lib/sales-contract-core'
import { pendingLinkFor } from '@/lib/sales-contract'
import { getSetting } from '@/lib/settings'
import { termsLockedBy } from '@/lib/commission-lock'
import { formatIls } from '@/lib/commission'
import { WeekLineCard } from '@/components/calls/WeekLineCard'
import { lessonLinksFor, loadRepWeek } from '@/lib/straight-line-week-data'

export const metadata = { title: 'Salesperson' }
export const dynamic = 'force-dynamic'

export default async function TeamMemberPage(props: { params: Promise<{ id: string }> }): Promise<React.ReactElement> {
  const params = await props.params;
  const me = await requireUser(['ADMIN'])
  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, name: true, email: true, role: true, timeZone: true, createdAt: true } })
  if (!user || (user.role !== 'SALES' && user.role !== 'ADMIN')) notFound()
  const now = new Date()
  // Never select the file bytes in a list.
  const agreements = await prisma.agreement.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, select: { id: true, title: true, fileName: true, size: true, createdAt: true } })
  const signed = user.email ? await prisma.agreementAcceptance.findMany({ where: { email: user.email.toLowerCase() }, orderBy: { signedAt: 'desc' }, select: { id: true, version: true, signedAt: true } }) : []
  const endedOn = user.email ? (await prisma.allowedUser.findUnique({ where: { email: user.email }, select: { terminatedAt: true } }))?.terminatedAt ?? null : null
  // The agreement maker lives here, per person: their pending link, the admins who can sign, and the saved company details
  const agreementData =
    user.role === 'SALES' && user.email
      ? await Promise.all([
          pendingLinkFor(user.email),
          prisma.user.findMany({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, email: true, contractSigner: { select: { name: true, title: true, signature: true } } } }),
          getSetting('contract.company'),
          termsForAssignee(user.id),
        ])
      : null
  const lockedTerms = user.role === 'SALES' ? await termsLockedBy(user.email) : null
  const [lineWeek, lessons] = await Promise.all([loadRepWeek(user.id).catch(() => null), lessonLinksFor(me)])
  const [stats, tasks, leads, meetings] = await Promise.all([
    loadRepStats(me).then((all) => all.find((r) => r.id === user.id) ?? null),
    tasksForUser(me),
    prisma.lead.findMany({
      where: { assignedToId: user.id, status: { notIn: ['WON', 'LOST'] } },
      orderBy: { updatedAt: 'desc' },
      take: 12,
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true, status: true, quotedPrice: true, updatedAt: true },
    }),
    prisma.booking.findMany({ where: { hostId: user.id, status: 'CONFIRMED', startTime: { gt: now } }, orderBy: { startTime: 'asc' }, take: 8, select: { id: true, title: true, guestName: true, startTime: true } }),
  ])
  const open = tasks.all
    .filter((t) => isOpenTask(t, user.id, tasks.leads.get(t.leadId)?.assignedToId))
    .sort((a, b) => (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity))
  const display = user.name ?? user.email ?? 'Unnamed'
  const cards = stats
    ? [
        { label: 'Won', value: `₪${formatMoney(stats.wonValue)}`, sub: `${stats.won} deal${stats.won === 1 ? '' : 's'}` },
        { label: 'Last 30 days', value: `₪${formatMoney(stats.wonValue30)}`, sub: `${stats.won30} won` },
        { label: 'Win rate', value: stats.conversion == null ? '—' : `${stats.conversion}%`, sub: `${stats.won} won · ${stats.lost} lost` },
        { label: 'Open leads', value: String(stats.openLeads), sub: `${stats.upcomingMeetings} upcoming meetings` },
        { label: 'Open tasks', value: String(stats.openTasks), sub: stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : 'None overdue' },
        { label: 'Last active', value: stats.lastActive ? timeAgo(stats.lastActive, now) : 'Never', sub: `Joined ${user.createdAt.toLocaleDateString('en-GB')}` },
      ]
    : []
  return (
    <div className="space-y-6">
      <Link href="/admin/team" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        ← Sales team
      </Link>
      <PageIntro title={display} hint={`${user.email ?? ''} · ${user.role === 'ADMIN' ? 'Admin' : 'Sales'} · ${user.timeZone.replaceAll('_', ' ')}`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-[var(--card-pad)]">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <div className="mt-1 text-2xl font-semibold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {lineWeek ? (
        <>
          <WeekLineCard title={`${display}: week on the Straight Line`} week={lineWeek.week} prevDiscipline={lineWeek.prev.discipline} lessons={lessons} callHref={(id) => `/sales/calls/${id}`} />
          {lineWeek.recent.length ? (
            <Card>
              <CardHeader>
                <CardTitle>This week’s calls on the line</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {lineWeek.recent.map((c) => (
                  <Link key={c.id} href={`/sales/calls/${c.id}`} className="block rounded-lg border p-2 transition hover:border-primary/50">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span className="truncate">{c.who}</span>
                      <span>{formatDateTime(c.startedAt, user.timeZone)}</span>
                    </div>
                    <StraightLineChart map={c.map} durationSec={c.durationSec} compact />
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open tasks ({open.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {open.length === 0 ? <p className="text-sm text-muted-foreground">Nothing open. All caught up.</p> : null}
            {open.slice(0, 15).map((t) => {
              const lead = tasks.leads.get(t.leadId)
              const overdue = t.dueAt && t.dueAt < now
              return (
                <div key={t.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{t.title}</div>
                    {lead ? (
                      <Link href={`/sales/leads/${lead.id}`} className="text-xs text-muted-foreground underline-offset-4 hover:underline">
                        {leadName(lead)}
                      </Link>
                    ) : null}
                  </div>
                  <span className={`shrink-0 text-xs ${overdue ? 'text-red-400' : 'text-muted-foreground'}`}>{t.dueAt ? `${overdue ? 'Overdue · ' : ''}${formatDateTime(t.dueAt, user.timeZone)}` : 'No due date'}</span>
                </div>
              )
            })}
            {open.length > 15 ? <p className="text-xs text-muted-foreground">+ {open.length - 15} more</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Upcoming meetings ({meetings.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {meetings.length === 0 ? <p className="text-sm text-muted-foreground">No meetings booked.</p> : null}
            {meetings.map((m) => (
              <div key={m.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0 truncate">
                  <span className="font-medium">{m.title}</span> <span className="text-muted-foreground">with {m.guestName}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(m.startTime, user.timeZone)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Open leads ({stats?.openLeads ?? leads.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {leads.length === 0 ? <p className="text-sm text-muted-foreground">No open leads assigned.</p> : null}
          {leads.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <Link href={`/sales/leads/${l.id}`} className="font-medium underline-offset-4 hover:underline">
                {leadName(l)}
                {l.company ? <span className="font-normal text-muted-foreground"> · {l.company}</span> : null}
              </Link>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{STATUS_LABEL[l.status]}</Badge>
                <span className="text-xs text-muted-foreground">{timeAgo(l.updatedAt, now)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      {user.role === 'SALES' ? (
        <Card>
          <CardHeader>
            <CardTitle>Commission terms</CardTitle>
          </CardHeader>
          <CardContent>
            {lockedTerms ? (
              (() => {
                // While a contract is waiting for signature, show the figures in that contract; once signed, the signed terms
                const pend = lockedTerms.kind === 'pending' ? agreementData?.[0] : null
                const saved = agreementData?.[3]
                const t = pend ? { baseRatePct: pend.figures.basePercent, threshold: pend.figures.threshold, incrementSize: pend.figures.increment, bonusPerIncrement: pend.figures.bonus } : saved
                return t ? (
                  <div className="space-y-2 text-sm">
                    <p>
                      <b>{t.baseRatePct}%</b> of every payment the client makes. Bonus of <b>{formatIls(t.bonusPerIncrement)}</b> for every <b>{formatIls(t.incrementSize)}</b> of the contract price above <b>{formatIls(t.threshold)}</b>, paid only once the whole price is paid.
                    </p>
                    <p className="text-muted-foreground">
                      {lockedTerms.kind === 'signed'
                        ? `Locked by the agreement signed on ${lockedTerms.at.toLocaleDateString('en-GB')}. You can see these terms but not change them. To change them, send a new agreement below with the new figures.`
                        : 'Locked: this contract was sent and is waiting for the salesperson’s signature. You can see these figures but not change them here. To change them, send a new agreement below with the new figures: it replaces the link.'}
                    </p>
                  </div>
                ) : null
              })()
            ) : (
            <CommissionTermsForm userId={user.id} terms={await termsForAssignee(user.id)} usingDefaults={!(await prisma.allowedUser.findUnique({ where: { email: user.email ?? '' }, select: { commissionTerms: true } }))?.commissionTerms} />
            )}
          </CardContent>
        </Card>
      ) : null}
      {user.role === 'SALES' ? (
        <Card id="agreement" className="scroll-mt-6">
          <CardHeader>
            <CardTitle>Commission agreement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {signed[0]?.version === CONTRACT_VERSION ? (
              <p>
                <span className="text-emerald-400">Signed the current agreement</span> on {signed[0].signedAt.toLocaleDateString('en-GB')} ·{' '}
                <a className="underline" href={`/api/agreements/signed/${signed[0].id}`}>Download the signed PDF</a>
              </p>
            ) : (
              <p className="text-amber-300">
                {signed.length ? 'They signed an older version.' : 'No signed agreement on file.'} Send them the new one below.
              </p>
            )}
            {signed.length > 1 ? <p className="text-xs text-muted-foreground">{signed.length} signed copies on file.</p> : null}
            {agreementData ? (
              <div className="border-t pt-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">Send the agreement</p>
                  <a className="text-xs underline" href="/admin/sales-contracts">Company details, signatures and everyone’s status</a>
                </div>
                <PersonContractForm
                  key={agreementData[0]?.code ?? 'none'}
                  person={{ name: user.name ?? user.email ?? 'Salesperson', email: user.email ?? '' }}
                  initialFigures={{ threshold: agreementData[3].threshold, basePercent: agreementData[3].baseRatePct, bonus: agreementData[3].bonusPerIncrement, increment: agreementData[3].incrementSize }}
                  signers={agreementData[1].map((a) => ({ userId: a.id, name: a.contractSigner?.name || a.name || a.email || 'Admin', title: a.contractSigner?.title ?? '', signature: a.contractSigner?.signature ?? '' }))}
                  meId={me.id}
                  adminEmail={me.email}
                  company={agreementData[2]}
                  pending={agreementData[0] ? { url: agreementData[0].url, expiresAt: agreementData[0].expiresAt.toISOString() } : null}
                />
              </div>
            ) : null}
            <div className="border-t pt-3">
              <p className="mb-2 font-medium">Agreement end date</p>
              <TerminationForm userId={user.id} endedOn={endedOn ? endedOn.toISOString().slice(0, 10) : null} />
            </div>
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Agreements</CardTitle>
        </CardHeader>
        <CardContent>
          <AgreementsPanel userId={user.id} name={display} agreements={agreements.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Personal details</CardTitle>
        </CardHeader>
        <CardContent>
          <TeamMemberForm userId={user.id} name={user.name ?? ''} email={user.email ?? ''} timeZone={user.timeZone} />
          <p className="mt-4 text-xs text-muted-foreground">
            Role and access are managed under{' '}
            <Link href="/admin/users" className="underline underline-offset-4">
              Team
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
