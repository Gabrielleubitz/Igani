import { DangerButton } from '../_components/DangerButton'
import { removeAllowedUser, setAllTimeZones } from '@/app/actions/admin'
import { AllowedUserForm, AllowedUserToggle } from '@/components/admin/forms'
import { PageIntro } from '@/components/PageIntro'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Popover } from '@/components/ui/popover'
import { DEFAULT_TIME_ZONE } from '@/lib/default-time-zone'
import { requireUser } from '@/lib/auth'
import { timeAgo } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Team access' }
export const dynamic = 'force-dynamic'

export default async function UsersPage(): Promise<React.ReactElement> {
  const me = await requireUser(['ADMIN'])
  const [allowed, users] = await Promise.all([
    prisma.allowedUser.findMany({ orderBy: [{ active: 'desc' }, { email: 'asc' }] }),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        _count: { select: { assignedLeads: { where: { archived: false, status: { notIn: ['WON', 'LOST'] } } } } },
        accounts: { select: { refresh_token: true, scope: true } },
        mailboxSync: { select: { lastSyncedAt: true, lastError: true } },
      },
    }),
  ])
  const lastSeen = await prisma.activityLog.groupBy({ by: ['actorId'], where: { actorId: { in: users.map((u) => u.id) } }, _max: { createdAt: true } })
  const seen = new Map(lastSeen.map((s) => [s.actorId, s._max.createdAt]))
  const byEmail = new Map(users.map((u) => [u.email, u]))
  const now = new Date()
  const active = allowed.filter((a) => a.active).length
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageIntro title="Team access" hint={`Only people listed here can sign in (${active} active). Add a teammate, pick their role, and they get a branded invite email.`} />
        <Popover label="+ Add teammate" panelClassName="w-[min(92vw,36rem)]">
            <AllowedUserForm />
          </Popover>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
        <span className="text-muted-foreground">Times on Today and Meetings use each person&apos;s time zone. Put the whole team on {DEFAULT_TIME_ZONE.replaceAll('_', ' ')} in one click.</span>
        <DangerButton label={`Set everyone to ${DEFAULT_TIME_ZONE.replaceAll('_', ' ')}`} confirm={`Change every teammate's time zone to ${DEFAULT_TIME_ZONE}?`} action={async () => { 'use server'; const r = await setAllTimeZones(DEFAULT_TIME_ZONE); return r.ok ? { ok: true } : { ok: false, error: r.error } }} />
      </div>
      <div className="divide-y rounded-lg border">
        {allowed.map((a) => {
          const u = byEmail.get(a.email)
          const calendar = u?.accounts.some((acc) => Boolean(acc.refresh_token))
          const gmail = u?.accounts.some((acc) => Boolean(acc.refresh_token) && acc.scope?.includes('gmail.readonly'))
          const last = u ? seen.get(u.id) : null
          const isMe = a.email === me.email
          const status = !a.active
            ? { label: 'Inactive', variant: 'destructive' as const }
            : u
              ? { label: 'Active', variant: 'success' as const }
              : a.invitedAt
                ? { label: `Invited ${timeAgo(a.invitedAt, now)}`, variant: 'warning' as const }
                : { label: 'Not invited yet', variant: 'outline' as const }
          return (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                  {(u?.name ?? a.email)[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-medium">
                    {u?.name ?? a.email} {isMe ? <span className="text-xs font-normal text-muted-foreground">(you)</span> : null}
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {a.email}
                    {u ? ` · ${u._count.assignedLeads} open contact${u._count.assignedLeads === 1 ? '' : 's'}` : ''}
                    {u && a.role !== 'MARKETING' ? (calendar ? ' · 📅 calendar connected' : ' · ⚠ calendar not connected') : ''}
                    {u ? (gmail ? (u.mailboxSync?.lastError ? ` · ⚠ Gmail sync error: ${u.mailboxSync.lastError.slice(0, 60)}` : ' · 📨 Gmail synced') : ' · Gmail not connected') : ''}
                    {last ? ` · last active ${timeAgo(last, now)}` : ''}
                  </div>
                </div>
              </div>
              {isMe ? (
                <span className="text-xs text-muted-foreground">Admin</span>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <AllowedUserToggle email={a.email} role={a.role} active={a.active} showResend={!u} />
                  <DangerButton
                    label="Remove"
                    confirm={`Remove ${a.email}? They lose access and their contacts become unassigned.`}
                    action={async () => {
                      'use server'
                      return removeAllowedUser(a.email)
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
