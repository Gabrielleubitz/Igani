import { DangerButton } from '../_components/DangerButton'
import { removeAllowedUser } from '@/app/actions/admin'
import { AllowedUserForm, AllowedUserToggle } from '@/components/admin/forms'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/prisma'

export const metadata = { title: 'Team' }

export default async function UsersPage(): Promise<React.ReactElement> {
  const [allowed, users] = await Promise.all([
    prisma.allowedUser.findMany({ orderBy: [{ active: 'desc' }, { email: 'asc' }] }),
    prisma.user.findMany({ select: { email: true, name: true, _count: { select: { assignedLeads: true } }, accounts: { select: { refresh_token: true } } } }),
  ])
  const byEmail = new Map(users.map((u) => [u.email, u]))
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Team</h1>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">+ Add team member</summary>
          <div className="absolute right-0 z-20 mt-2 w-[min(92vw,36rem)] rounded-lg border bg-card p-4 shadow-lg">
            <AllowedUserForm />
          </div>
        </details>
      </div>
      <div className="divide-y rounded-lg border">
        {allowed.map((a) => {
          const u = byEmail.get(a.email)
          const calendar = u?.accounts.some((acc) => Boolean(acc.refresh_token))
          return (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div>
                <div className="font-medium">
                  {u?.name ?? a.email} {!a.active ? <Badge variant="destructive">inactive</Badge> : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {a.email} · {u ? `${u._count.assignedLeads} leads · ` : ''}{u ? (calendar ? 'Google Calendar connected' : 'signed in, calendar not connected') : 'never signed in'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AllowedUserToggle email={a.email} role={a.role} active={a.active} />
                <DangerButton label="Remove" confirm={`Remove ${a.email}? They lose access and their leads become unassigned.`} action={async () => { 'use server'; return removeAllowedUser(a.email) }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
