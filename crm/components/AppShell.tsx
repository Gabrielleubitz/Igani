import Link from 'next/link'
import type { ReactNode } from 'react'
import type { SessionUser } from '@/lib/auth'
import { Logo } from '@/components/brand/Logo'
import { SignOutButton } from './AuthButtons'
import { AppNav, type NavGroup } from './AppNav'

type Role = SessionUser['role']
const ALL: Role[] = ['ADMIN', 'SALES', 'MARKETING']

const NAV: { title: string; items: { href: string; label: string; roles: Role[] }[] }[] = [
  {
    title: 'Workspace',
    items: [
      { href: '/sales/today', label: 'Today', roles: ALL },
      { href: '/sales/leads', label: 'Contacts', roles: ALL },
      { href: '/sales/board', label: 'Board', roles: ALL },
      { href: '/sales/tasks', label: 'Tasks', roles: ALL },
      { href: '/sales/reports', label: 'Reports', roles: ALL },
    ],
  },
  {
    title: 'Sales',
    items: [
      { href: '/sales', label: 'Pipeline & meetings', roles: ['ADMIN', 'SALES'] },
      { href: '/sales/invite', label: 'Send invite', roles: ['ADMIN', 'SALES'] },
      { href: '/sales/availability', label: 'My hours', roles: ['ADMIN', 'SALES'] },
      { href: '/marketing', label: 'Marketing', roles: ['ADMIN', 'MARKETING'] },
    ],
  },
  {
    title: 'Admin',
    items: [
      { href: '/admin/dashboard', label: 'Overview', roles: ['ADMIN'] },
      { href: '/admin/bookings', label: 'Bookings', roles: ['ADMIN'] },
      { href: '/admin/booking-pages', label: 'Booking pages', roles: ['ADMIN'] },
      { href: '/admin/users', label: 'Team', roles: ['ADMIN'] },
      { href: '/admin/audit', label: 'Audit log', roles: ['ADMIN'] },
      { href: '/admin/settings', label: 'Settings', roles: ['ADMIN'] },
    ],
  },
]

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }): React.ReactElement {
  const groups: NavGroup[] = NAV.map((g) => ({
    title: g.title,
    items: g.items.filter((i) => i.roles.includes(user.role)).map(({ href, label }) => ({ href, label })),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b bg-card/40 lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:flex-col lg:items-stretch lg:gap-5 lg:px-4 lg:py-5">
          <Link href="/" aria-label="Igani home">
            <Logo height={24} />
          </Link>
          <div className="lg:hidden">
            <SignOutButton />
          </div>
          <div className="hidden lg:block">
            <AppNav groups={groups} />
          </div>
        </div>
        <div className="px-4 pb-3 lg:hidden">
          <AppNav groups={groups} />
        </div>
        <div className="hidden border-t px-4 py-4 lg:block">
          <div className="truncate text-sm font-medium">{user.email}</div>
          <div className="mb-2 text-xs capitalize text-muted-foreground">{user.role.toLowerCase()}</div>
          <SignOutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
