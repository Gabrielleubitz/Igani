import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { SessionUser } from '@/lib/auth'
import { SignOutButton } from './AuthButtons'

const NAV: { href: string; label: string; roles: SessionUser['role'][] }[] = [
  { href: '/admin/dashboard', label: 'Overview', roles: ['ADMIN'] },
  { href: '/sales/today', label: 'Today', roles: ['ADMIN', 'SALES', 'MARKETING'] },
  { href: '/sales/leads', label: 'Contacts', roles: ['ADMIN', 'SALES', 'MARKETING'] },
  { href: '/sales', label: 'Pipeline', roles: ['ADMIN', 'SALES'] },
  { href: '/sales/board', label: 'Board', roles: ['ADMIN', 'SALES', 'MARKETING'] },
  { href: '/sales/tasks', label: 'Tasks', roles: ['ADMIN', 'SALES', 'MARKETING'] },
  { href: '/sales/reports', label: 'Reports', roles: ['ADMIN', 'SALES', 'MARKETING'] },
  { href: '/sales/invite', label: 'New invite', roles: ['ADMIN', 'SALES'] },
  { href: '/sales/availability', label: 'My hours', roles: ['ADMIN', 'SALES'] },
  { href: '/marketing', label: 'Marketing', roles: ['ADMIN', 'MARKETING'] },
  { href: '/admin/bookings', label: 'Bookings', roles: ['ADMIN'] },
  { href: '/admin/booking-pages', label: 'Booking pages', roles: ['ADMIN'] },
  { href: '/admin/users', label: 'Team', roles: ['ADMIN'] },
  { href: '/admin/audit', label: 'Audit log', roles: ['ADMIN'] },
  { href: '/admin/settings', label: 'Settings', roles: ['ADMIN'] },
]

export function AppShell({ user, children }: { user: SessionUser; children: ReactNode }): React.ReactElement {
  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <Link href="/">
            <Image src="/igani-logo.png" alt="Igani" width={80} height={24} className="h-6 w-auto" />
          </Link>
          <nav className="flex flex-1 flex-wrap gap-4 text-sm text-muted-foreground">
            {NAV.filter((n) => n.roles.includes(user.role)).map((n) => (
              <Link key={n.href} href={n.href} className="hover:text-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="text-xs text-muted-foreground">
            {user.email} · {user.role}
          </span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  )
}
