'use client'

import {
  CalendarCheck,
  CalendarDays,
  ChartColumn,
  Clock,
  LayoutDashboard,
  Link as LinkIcon,
  ListChecks,
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
  PhoneCall,
  Users,
  type LucideIcon,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { NavMenu, type MenuNode } from '@/components/ui/multi-level-collapsible-menu'

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
  videos: Video,
  teamMeetings: Video,
  website: Globe,
  phone: Phone,
  calls: PhoneCall,
  callLists: ListChecks,
  settings: Settings,
}

/** A menu entry as the server sends it: icons are names (mapped to lucide icons here), folders have children. */
export type NavNode = { id: string; label: string; icon?: string; href?: string; badge?: number; children?: NavNode[] }

function toMenu(nodes: NavNode[]): MenuNode[] {
  return nodes.map((n) => {
    const Icon = n.icon ? ICONS[n.icon] : undefined
    return { id: n.id, label: n.label, href: n.href, badge: n.badge, icon: Icon ? <Icon aria-hidden /> : undefined, children: n.children ? toMenu(n.children) : undefined }
  })
}

export function AppNav({ nodes, expanded = false }: { nodes: NavNode[]; expanded?: boolean }): React.ReactElement {
  const menu = useMemo(() => toMenu(nodes), [nodes])
  return <NavMenu nodes={menu} expanded={expanded} />
}

/** Phone/tablet: a Menu button that opens every grouped link in a panel. */
export function MobileMenu({ nodes }: { nodes: NavNode[] }): React.ReactElement {
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
          <AppNav nodes={nodes} expanded />
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
