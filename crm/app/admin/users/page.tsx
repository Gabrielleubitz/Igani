import { DangerButton } from '../_components/DangerButton'
import { removeAllowedUser } from '@/app/actions/admin'
import { AllowedUserForm, AllowedUserToggle } from '@/components/admin/forms'
import { PageIntro } from '@/components/PageIntro'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { requireUser } from '@/lib/auth'
import { timeAgo } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Team' }
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
        _count: { select: { assignedLeads: { where: { archived: false, status: { notIn: ['WON', 'LOST'] } } }, availability: true } },
        accounts: { select: { refresh_token: true } },
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
        <PageIntro title="Team" hint={`Only people listed here can sign in (${active} active). Add a teammate, pick their role, and they get a branded invite email.`} />
        <details className="relative">
          <summary className={`${buttonVariants()} cursor-pointer list-none`}>+ Add teammate</summary>
          <div className="absolute right-0 z-30 mt-2 w-[min(92vw,36rem)] rounded-xl border bg-card p-4 shadow-2xl">
            <AllowedUserForm />
          </div>
        </details>
      </div>
      <div className="divide-y rounded-lg border">
        {allowed.map((a) => {
          const u = byEmail.get(a.email)
          const calendar = u?.accounts.some((acc) => Boolean(acc.refresh_token))
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
                    {u && a.role !== 'MARKETING' && u._count.availability === 0 ? ' · no working hours set' : ''}
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
