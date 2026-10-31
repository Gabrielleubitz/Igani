'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export type NavGroup = { title: string; items: { href: string; label: string }[] }

function isActive(pathname: string, href: string): boolean {
  if (href === '/sales') return pathname === '/sales'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppNav({ groups }: { groups: NavGroup[] }): React.ReactElement {
  const pathname = usePathname() ?? ''
  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {groups.map((g) => (
        <div key={g.title} className="space-y-1">
          <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{g.title}</div>
          {g.items.map((n) => {
            const active = isActive(pathname, n.href)
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors',
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
        <div id="mobile-menu" className="absolute inset-x-0 top-full z-40 max-h-[calc(100vh-4rem)] overflow-y-auto border-b bg-background p-4 shadow-lg">
          <AppNav groups={groups} />
        </div>
      ) : null}
    </div>
  )
}
