import type { Role } from '@prisma/client'

/**
 * The CRM's sections and who may see each one. The web sidebar (components/AppShell.tsx) and the iOS app's More tab
 * (via /api/mobile/v1/me) both read this list, so they always agree.
 */
const ALL: Role[] = ['ADMIN', 'SALES', 'MARKETING']
const SELLERS: Role[] = ['ADMIN', 'SALES']

export type NavEntry = { id: string; label: string; icon?: string; href?: string; roles: Role[]; children?: NavEntry[] }

/** The sidebar: categories that open into their pages. Each entry lists who may see it; folders with nothing left are hidden. */
export const NAV: NavEntry[] = [
  { id: 'today', label: 'Today', icon: 'today', href: '/sales/today', roles: ALL },
  { id: 'chat', label: 'Team chat', icon: 'chat', href: '/sales/chat', roles: ALL },
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
      { id: 'igani-meet', label: 'Igani Meet', icon: 'meet', href: '/meet', roles: ALL },
      { id: 'team-meeting', label: 'Book meeting with team', icon: 'teamMeetings', href: '/sales/team-meeting', roles: SELLERS },
      { id: 'invite', label: 'Book meeting with client', icon: 'invite', href: '/sales/invite', roles: SELLERS },
    ],
  },
  { id: 'straight-line', label: 'The Straight Line', icon: 'videos', href: '/sales/videos', roles: ALL },
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
          { id: 'payouts', label: 'Payouts', icon: 'documents', href: '/admin/payouts', roles: ['ADMIN'] },
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

/** Pages this role may open, flattened with the folder they sit in (for the app's More tab). */
export function navPagesFor(role: Role): { id: string; label: string; icon: string | null; href: string; group: string | null }[] {
  const out: { id: string; label: string; icon: string | null; href: string; group: string | null }[] = []
  const walk = (entries: NavEntry[], group: string | null): void => {
    for (const e of entries) {
      if (!e.roles.includes(role)) continue
      if (e.href) out.push({ id: e.id, label: e.label, icon: e.icon ?? null, href: e.href, group })
      if (e.children) walk(e.children, e.href ? group : e.label)
    }
  }
  walk(NAV, null)
  return out
}
