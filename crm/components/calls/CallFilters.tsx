'use client'

import { Search, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { cn } from '@/lib/utils'

export interface CallTab {
  key: string
  label: string
  count: number
  dot: string
}

/**
 * The bar above the calls list: what kind of calls (tabs with counts), the time window, the person (admins) and a search.
 * Everything lives in the URL, so a filtered view can be shared or bookmarked.
 */
export function CallFilters({ tabs, view, range, q, person, people }: { tabs: CallTab[]; view: string; range: string; q: string; person: string; people: { id: string; label: string }[] | null }): React.ReactElement {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()
  const [text, setText] = useState(q)
  const first = useRef(true)

  const hrefWith = (patch: Record<string, string | null>): string => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === '') next.delete(k)
      else next.set(k, v)
    }
    next.delete('limit') // a new filter starts from the first page
    const s = next.toString()
    return s ? `${pathname}?${s}` : pathname
  }

  // search as you type (after a short pause)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const t = setTimeout(() => start(() => router.replace(hrefWith({ q: text.trim() || null }), { scroll: false })), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const RANGES = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: 'all', label: 'All time' },
  ]

  return (
    <div className={cn('space-y-3 transition-opacity', pending && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search name, company or number"
            aria-label="Search calls"
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {text ? (
            <button type="button" onClick={() => setText('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex rounded-lg border bg-card/60 p-0.5 text-xs" role="group" aria-label="Time window">
          {RANGES.map((r) => (
            <Link key={r.key} href={hrefWith({ range: r.key === '30d' ? null : r.key })} scroll={false} className={cn('rounded-md px-2.5 py-1.5 font-medium transition', range === r.key ? 'bg-primary/20 text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
              {r.label}
            </Link>
          ))}
        </div>

        {people ? (
          <select
            value={person}
            onChange={(e) => start(() => router.replace(hrefWith({ person: e.target.value || null }), { scroll: false }))}
            aria-label="Teammate"
            className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="">Everyone</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5" aria-label="Kind of call">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={hrefWith({ view: t.key === 'all' ? null : t.key })}
            scroll={false}
            className={cn('inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition', view === t.key ? 'border-primary/50 bg-primary/15 font-medium text-foreground' : 'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground')}
          >
            <span className={cn('h-2 w-2 rounded-full', t.dot)} aria-hidden />
            {t.label}
            <span className={cn('rounded-full px-1.5 text-[11px] tabular-nums', view === t.key ? 'bg-primary/25' : 'bg-muted')}>{t.count}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
