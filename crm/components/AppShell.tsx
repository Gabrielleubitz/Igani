import Link from 'next/link'
import type { ReactNode } from 'react'
import type { SessionUser } from '@/lib/auth'
import { Logo } from '@/components/brand/Logo'
import { TaskAlert } from '@/components/crm/TaskAlert'
import { avatarPath, isGooglePhoto } from '@/lib/avatar'
import { ensureAvatar } from '@/lib/avatar-sync'
import { prisma } from '@/lib/prisma'
import { SignOutButton } from './AuthButtons'
import { SessionKeepAlive } from './SessionKeepAlive'
import { AppNav, GlobalSearch, MobileMenu, type NavNode } from './AppNav'

type Role = SessionUser['role']
const ALL: Role[] = ['ADMIN', 'SALES', 'MARKETING']
const SELLERS: Role[] = ['ADMIN', 'SALES']

type Entry = { id: string; label: string; icon?: string; href?: string; roles: Role[]; children?: Entry[] }

/** The sidebar: categories that open into their pages. Each entry lists who may see it; folders with nothing left are hidden. */
const NAV: Entry[] = [
  { id: 'today', label: 'Today', icon: 'today', href: '/sales/today', roles: ALL },
  {
    id: 'sales',
    label: 'Sales',
    icon: 'contacts',
    roles: ALL,
    children: [
      { id: 'leads', label: 'Leads', icon: 'contacts', href: '/sales/leads', roles: ALL },
      { id: 'board', label: 'Board', icon: 'board', href: '/sales/board', roles: ALL },
      { id: 'tasks', label: 'Tasks', icon: 'tasks', href: '/sales/tasks', roles: ALL },
      { id: 'analytics', label: 'Analytics', icon: 'reports', href: '/sales/reports', roles: ALL },
    ],
  },
  {
    id: 'calling',
    label: 'Calling',
    icon: 'calls',
    roles: SELLERS,
    children: [
      { id: 'calls', label: 'Calls', icon: 'calls', href: '/sales/calls', roles: SELLERS },
      { id: 'call-lists', label: 'Call lists', icon: 'callLists', href: '/sales/call-lists', roles: SELLERS },
    ],
  },
  {
    id: 'meetings',
    label: 'Meetings',
    icon: 'meetings',
    roles: SELLERS,
    children: [
      { id: 'team-meeting', label: 'Book meeting with team', icon: 'teamMeetings', href: '/sales/team-meeting', roles: SELLERS },
      { id: 'invite', label: 'Book meeting with client', icon: 'invite', href: '/sales/invite', roles: SELLERS },
    ],
  },
  { id: 'training', label: 'Training', icon: 'videos', roles: ALL, children: [{ id: 'videos', label: 'Videos', icon: 'videos', href: '/sales/videos', roles: ALL }] },
  {
    id: 'tools',
    label: 'Tools',
    icon: 'documents',
    roles: ['SALES', 'ADMIN', 'MARKETING'],
    children: [
      { id: 'documents', label: 'Documents', icon: 'documents', href: '/sales/documents', roles: ['SALES'] },
      { id: 'marketing', label: 'Marketing', icon: 'marketing', href: '/marketing', roles: ['ADMIN', 'MARKETING'] },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: 'overview',
    roles: ['ADMIN'],
    children: [
      { id: 'overview', label: 'Overview', icon: 'overview', href: '/admin/dashboard', roles: ['ADMIN'] },
      {
        id: 'clients',
        label: 'Clients & offers',
        icon: 'offers',
        roles: ['ADMIN'],
        children: [
          { id: 'offers', label: 'Offers', icon: 'offers', href: '/admin/offers', roles: ['ADMIN'] },
          { id: 'sales-contracts', label: 'Sales contracts', icon: 'documents', href: '/admin/sales-contracts', roles: ['ADMIN'] },
          { id: 'bookings', label: 'Bookings', icon: 'bookings', href: '/admin/bookings', roles: ['ADMIN'] },
          { id: 'booking-pages', label: 'Booking pages', icon: 'pages', href: '/admin/booking-pages', roles: ['ADMIN'] },
          { id: 'team-meetings', label: 'Team meetings', icon: 'teamMeetings', href: '/admin/team-meetings', roles: ['ADMIN'] },
        ],
      },
      {
        id: 'content',
        label: 'Content',
        icon: 'website',
        roles: ['ADMIN'],
        children: [
          { id: 'video-library', label: 'Video library', icon: 'videos', href: '/admin/videos', roles: ['ADMIN'] },
          { id: 'website', label: 'Website', icon: 'website', href: '/admin/website', roles: ['ADMIN'] },
          { id: 'phone', label: 'Phone', icon: 'phone', href: '/admin/phone', roles: ['ADMIN'] },
        ],
      },
      {
        id: 'people',
        label: 'People',
        icon: 'team',
        roles: ['ADMIN'],
        children: [
          { id: 'sales-team', label: 'Sales team', icon: 'performance', href: '/admin/team', roles: ['ADMIN'] },
          { id: 'team-access', label: 'Team access', icon: 'team', href: '/admin/users', roles: ['ADMIN'] },
          { id: 'audit', label: 'Audit log', icon: 'audit', href: '/admin/audit', roles: ['ADMIN'] },
        ],
      },
      { id: 'settings', label: 'Settings', icon: 'settings', href: '/admin/settings', roles: ['ADMIN'] },
    ],
  },
]

/** Keeps the entries this role may see; a folder with no visible pages disappears. */
function visible(entries: Entry[], role: Role, badges: Record<string, number>): NavNode[] {
  return entries.flatMap((e): NavNode[] => {
    if (!e.roles.includes(role)) return []
    if (e.children) {
      const children = visible(e.children, role, badges)
      return children.length ? [{ id: e.id, label: e.label, icon: e.icon, children }] : []
    }
    return [{ id: e.id, label: e.label, icon: e.icon, href: e.href, badge: badges[e.id] || undefined }]
  })
}

const ROLE_LABEL: Record<Role, string> = { ADMIN: 'Admin', SALES: 'Sales', MARKETING: 'Marketing' }

export async function AppShell({ user, children }: { user: SessionUser; children: ReactNode }): Promise<React.ReactElement> {
  const [pendingApprovals, me] = await Promise.all([
    user.role === 'ADMIN' ? prisma.booking.count({ where: { status: 'PENDING', source: 'PUBLIC_PAGE', startTime: { gt: new Date() } } }) : Promise.resolve(0),
    prisma.user.findUnique({ where: { id: user.id }, select: { id: true, image: true } }),
  ])
  // No photo yet: find it now (stored sign-in token, else Google; capped at ~2.5 s and retried every few hours)
  const image = isGooglePhoto(me?.image) ? me.image : (me ? await Promise.race([ensureAvatar(me.id).catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 2500))]) : null)
  const photo = me ? avatarPath({ id: me.id, image }) : null
  const nodes = visible(NAV, user.role, { bookings: pendingApprovals })
  const initials = (user.name ?? user.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

  const shell = (
    <div className="min-h-screen lg:flex">
      <SessionKeepAlive />
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
            <MobileMenu nodes={nodes} />
            <SignOutButton />
          </div>
          <div className="hidden lg:block">
            <GlobalSearch />
          </div>
          <div className="hidden lg:block">
            <AppNav nodes={nodes} />
          </div>
        </div>
        <div className="hidden items-center gap-3 border-t px-4 py-4 lg:flex">
          <div aria-hidden className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/20 text-sm font-semibold text-primary ring-1 ring-border">
            {initials}
            {/* the photo covers the initials once loaded; if it fails, the initials stay */}
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element -- our own cached 256px square; next/image would re-optimise it
              <img src={photo} alt="" width={36} height={36} decoding="async" fetchPriority="high" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
            ) : null}
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
          <TaskAlert userId={user.id} role={user.role} />
          {children}
        </div>
      </main>
    </div>
  )
  // The dialer lives in the root layout (DialerRoot) so a live call survives moving between sections
  return shell
}
