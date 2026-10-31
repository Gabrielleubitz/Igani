'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

export type NavGroup = { title: string; items: { href: string; label: string }[] }

function isActive(pathname: string, href: string): boolean {
  if (href === '/sales') return pathname === '/sales'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppNav({ groups }: { groups: NavGroup[] }): React.ReactElement {
  const pathname = usePathname() ?? ''
  return (
    <nav aria-label="Main" className="flex gap-4 overflow-x-auto lg:flex-col lg:gap-6 lg:overflow-visible">
      {groups.map((g) => (
        <div key={g.title} className="flex shrink-0 items-center gap-1 lg:block lg:space-y-1">
          <div className="hidden px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 lg:block">{g.title}</div>
          {g.items.map((n) => {
            const active = isActive(pathname, n.href)
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors',
                  active ? 'bg-primary/15 font-medium text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {n.label}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
