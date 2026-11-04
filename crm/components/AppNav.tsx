'use client'

import {
  CalendarCheck,
  CalendarDays,
  ChartColumn,
  Clock,
  LayoutDashboard,
  Link as LinkIcon,
  Megaphone,
  ScrollText,
  Send,
  Settings,
  SquareCheck,
  SquareKanban,
  Sun,
  FileText,
  FileSignature,
  TrendingUp,
  UserCog,
  Video,
  Globe,
  Phone,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const ICONS: Record<string, LucideIcon> = {
  today: Sun,
  contacts: Users,
  board: SquareKanban,
  tasks: SquareCheck,
  meetings: CalendarDays,
  reports: ChartColumn,
  invite: Send,
  hours: Clock,
  documents: FileText,
  marketing: Megaphone,
  overview: LayoutDashboard,
  bookings: CalendarCheck,
  pages: LinkIcon,
  team: UserCog,
  performance: TrendingUp,
  audit: ScrollText,
  offers: FileSignature,
  teamMeetings: Video,
  website: Globe,
  phone: Phone,
  settings: Settings,
}

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS | string; badge?: number; children?: { href: string; label: string }[] }
export type NavGroup = { title: string; items: NavItem[] }

function isActive(pathname: string, href: string): boolean {
  if (href === '/sales') return pathname === '/sales'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppNav({ groups, expanded = false }: { groups: NavGroup[]; expanded?: boolean }): React.ReactElement {
  const pathname = usePathname() ?? ''
  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.title} className="space-y-0.5">
          <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{g.title}</div>
          {g.items.map((n) => {
            const active = isActive(pathname, n.href)
            const Icon = ICONS[n.icon]
            return (
              <div key={n.href} className="group">
              <Link
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'bg-primary/15 font-medium text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {Icon ? <Icon aria-hidden className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : '')} /> : null}
                <span className="flex-1">{n.label}</span>
                {n.badge ? <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold tabular-nums text-primary-foreground">{n.badge}</span> : null}
              </Link>
              {n.children?.length ? (
                // Hover (or keyboard focus) the item to reveal its options; always open in the phone menu and when one is the current page.
                <div className={cn('ml-6 space-y-0.5 border-l pl-2', expanded || n.children.some((c) => isActive(pathname, c.href)) ? 'block' : 'hidden group-focus-within:block group-hover:block')}>
                  {n.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      aria-current={isActive(pathname, c.href) ? 'page' : undefined}
                      className={cn('block whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors', isActive(pathname, c.href) ? 'bg-primary/15 font-medium text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              ) : null}
              </div>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

/** Phone/tablet: a Menu button that opens every grouped link in a panel. */
export function MobileMenu({ groups }: { groups: NavGroup[] }): React.ReactElement {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  useEffect(() => setOpen(false), [pathname])
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-muted"
      >
        <span aria-hidden>{open ? '✕' : '☰'}</span> Menu
      </button>
      {open ? (
        <div id="mobile-menu" className="absolute inset-x-0 top-full z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b bg-background p-4 shadow-lg">
          <AppNav groups={groups} expanded />
        </div>
      ) : null}
    </div>
  )
}

/** Sidebar search: jumps to Contacts with the query. "/" focuses it from anywhere. */
export function GlobalSearch(): React.ReactElement {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null
      if (e.key === '/' && !(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable))) {
        e.preventDefault()
        document.getElementById('global-search')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <form action="/sales/leads" role="search" className="relative">
      <label htmlFor="global-search" className="sr-only">
        Search leads
      </label>
      <input
        id="global-search"
        name="q"
        placeholder="Search leads…"
        className="h-9 w-full rounded-md border border-input bg-background/60 pl-3 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border px-1 text-[10px] text-muted-foreground">/</kbd>
    </form>
  )
}
