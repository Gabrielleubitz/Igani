import Link from 'next/link'
import type { ReactNode } from 'react'
import type { SessionUser } from '@/lib/auth'
import { Logo } from '@/components/brand/Logo'
import { TaskAlert } from '@/components/crm/TaskAlert'
import { prisma } from '@/lib/prisma'
import { SignOutButton } from './AuthButtons'
import { AppNav, GlobalSearch, MobileMenu, type NavGroup } from './AppNav'

type Role = SessionUser['role']
const ALL: Role[] = ['ADMIN', 'SALES', 'MARKETING']
const SELLERS: Role[] = ['ADMIN', 'SALES']

const NAV: { title: string; items: { href: string; label: string; icon: string; roles: Role[] }[] }[] = [
  {
    title: 'Workspace',
    items: [
      { href: '/sales/today', label: 'Today', icon: 'today', roles: ALL },
      { href: '/sales/leads', label: 'Contacts', icon: 'contacts', roles: ALL },
      { href: '/sales/board', label: 'Board', icon: 'board', roles: ALL },
      { href: '/sales/tasks', label: 'Tasks', icon: 'tasks', roles: ALL },
      { href: '/sales', label: 'Meetings', icon: 'meetings', roles: SELLERS },
      { href: '/sales/reports', label: 'Reports', icon: 'reports', roles: ALL },
    ],
  },
  {
    title: 'Tools',
    items: [
      { href: '/sales/invite', label: 'Send meeting invite', icon: 'invite', roles: SELLERS },
      { href: '/sales/availability', label: 'My hours', icon: 'hours', roles: SELLERS },
      { href: '/sales/import', label: 'Import contacts', icon: 'import', roles: ALL },
      { href: '/marketing', label: 'Marketing', icon: 'marketing', roles: ['ADMIN', 'MARKETING'] },
    ],
  },
  {
    title: 'Admin',
    items: [
      { href: '/admin/dashboard', label: 'Overview', icon: 'overview', roles: ['ADMIN'] },
      { href: '/admin/bookings', label: 'Bookings', icon: 'bookings', roles: ['ADMIN'] },
      { href: '/admin/booking-pages', label: 'Booking pages', icon: 'pages', roles: ['ADMIN'] },
      { href: '/admin/users', label: 'Team', icon: 'team', roles: ['ADMIN'] },
      { href: '/admin/audit', label: 'Audit log', icon: 'audit', roles: ['ADMIN'] },
      { href: '/admin/settings', label: 'Settings', icon: 'settings', roles: ['ADMIN'] },
    ],
  },
]

const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Admin', SALES: 'Sales', MARKETING: 'Marketing' }

export async function AppShell({ user, children }: { user: SessionUser; children: ReactNode }): Promise<React.ReactElement> {
  const pendingApprovals = user.role === 'ADMIN' ? await prisma.booking.count({ where: { status: 'PENDING', source: 'PUBLIC_PAGE', startTime: { gt: new Date() } } }) : 0
  const groups: NavGroup[] = NAV.map((g) => ({
    title: g.title,
    items: g.items
      .filter((i) => i.roles.includes(user.role))
      .map(({ href, label, icon }) => ({ href, label, icon, badge: href === '/admin/bookings' ? pendingApprovals : undefined })),
  })).filter((g) => g.items.length > 0)
  const initials = (user.name ?? user.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      <aside className="relative border-b bg-card/40 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:flex-1 lg:flex-col lg:items-stretch lg:justify-start lg:gap-5 lg:overflow-y-auto lg:px-4 lg:py-5">
          <Link href="/" aria-label="Igani CRM home" className="flex items-center gap-2">
            <Logo height={32} />
            <span className="hidden rounded border border-primary/40 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider text-primary lg:inline">CRM</span>
          </Link>
          <div className="flex items-center gap-2 lg:hidden">
            <MobileMenu groups={groups} />
            <SignOutButton />
          </div>
          <div className="hidden lg:block">
            <GlobalSearch />
          </div>
          <div className="hidden lg:block">
            <AppNav groups={groups} />
          </div>
        </div>
        <div className="hidden items-center gap-3 border-t px-4 py-4 lg:flex">
          <div aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{user.name ?? user.email}</div>
            <div className="truncate text-xs text-muted-foreground">{ROLE_LABEL[user.role]}</div>
          </div>
          <SignOutButton />
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-4 lg:hidden">
            <GlobalSearch />
          </div>
          <TaskAlert userId={user.id} />
          {children}
        </div>
      </main>
    </div>
  )
}
