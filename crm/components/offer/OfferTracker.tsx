'use client'

import { useEffect } from 'react'

/**
 * Our own Hotjar for offer pages: how far the client scrolls, how long each section is on screen, where they click and
 * where the mouse goes. Positions are stored relative to the <section id> they happened in. It sends a small batch
 * every few seconds and one last one when the tab is hidden. Never runs inside a frame (studio preview, heatmap) or
 * for teammates (the CRM's "Open" link adds ?team=1, which this browser then remembers).
 */
const FLUSH_MS = 5000
const MOVE_MS = 120

function id(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  }
}

function store(get: () => string | null, set?: (v: string) => void): string | null {
  try {
    const v = get()
    if (v) return v
    if (set) {
      const n = id()
      set(n)
      return n
    }
  } catch {
    /* private mode / blocked storage */
  }
  return null
}

const SECTION = 'section[id]'

/** The section a point is in, and the point as fractions inside it. Outside any section → "page" (whole document). */
function locate(x: number, y: number, target: Element | null): { s: string; x: number; y: number } | null {
  const sec = target?.closest(SECTION) as HTMLElement | null
  if (sec && /^[a-z0-9-]{1,48}$/.test(sec.id)) {
    const r = sec.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return { s: sec.id, x: Math.min(1, Math.max(0, (x - r.left) / r.width)), y: Math.min(1, Math.max(0, (y - r.top) / r.height)) }
  }
  const h = document.documentElement.scrollHeight
  const w = document.documentElement.clientWidth
  return w && h ? { s: 'page', x: Math.min(1, Math.max(0, x / w)), y: Math.min(1, Math.max(0, (y + window.scrollY) / h)) } : null
}

function label(el: Element | null): string | undefined {
  const hit = el?.closest('a,button,[role=button],label,summary,input,select') as HTMLElement | null
  if (!hit) return undefined
  // The button's name, not all of its text: aria-label, else its first real line ("1\nThe website\n…" → "The website")
  const aria = hit.getAttribute('aria-label')?.trim()
  const line = (hit.innerText || '').split('\n').map((x) => x.replace(/\s+/g, ' ').trim()).find((x) => x.length > 1)
  const text = aria || line || hit.getAttribute('title')?.trim() || ''
  return text ? text.slice(0, 48) : hit.tagName.toLowerCase()
}

export function OfferTracker({ slug, lang }: { slug: string; lang: string }): null {
  useEffect(() => {
    if (window.top !== window.self) return
    const params = new URLSearchParams(location.search)
    try {
      if (params.get('team') === '1') {
        localStorage.setItem('igani-team', '1')
        params.delete('team')
        history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`)
      }
      if (localStorage.getItem('igani-team') === '1') return
    } catch {
      if (params.get('team') === '1') return
    }
    if (params.get('notrack') === '1') return

    const key = id()
    const visitorId = store(() => localStorage.getItem('igani-visitor'), (v) => localStorage.setItem('igani-visitor', v)) ?? id()
    const w = window.innerWidth
    const device = w < 640 ? 'phone' : w < 1024 ? 'tablet' : 'desktop'
    const start = performance.now()
    let visibleMs = 0
    let visibleSince: number | null = document.visibilityState === 'visible' ? start : null
    let maxScroll = 0
    const sections: Record<string, number> = {}
    const inView = new Map<string, number>() // section id → since (ms)
    let clicks: { s: string; x: number; y: number; t: number; l?: string }[] = []
    let moves: { s: string; x: number; y: number }[] = []
    let dirty = true
    let lastMove = 0
    let sentClicks = 0
    let sentMoves = 0

    const now = (): number => performance.now()
    const elapsed = (): number => Math.round(visibleMs + (visibleSince !== null ? now() - visibleSince : 0))
    const settleSections = (): void => {
      const t = now()
      for (const [s, since] of inView) {
        sections[s] = Math.round((sections[s] ?? 0) + (t - since))
        inView.set(s, t)
      }
    }
    const scroll = (): void => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      const pct = h <= 0 ? 100 : Math.round(((window.scrollY || 0) / h) * 100)
      if (pct > maxScroll) {
        maxScroll = Math.min(100, pct)
        dirty = true
      }
    }

    const io = new IntersectionObserver(
      (entries) => {
        const t = now()
        for (const e of entries) {
          const s = (e.target as HTMLElement).id
          if (e.isIntersecting && document.visibilityState === 'visible') inView.set(s, inView.get(s) ?? t)
          else if (inView.has(s)) {
            sections[s] = Math.round((sections[s] ?? 0) + (t - inView.get(s)!))
            inView.delete(s)
            dirty = true
          }
        }
      },
      { threshold: 0.35 },
    )
    const watchSections = (): void => document.querySelectorAll<HTMLElement>(SECTION).forEach((el) => /^[a-z0-9-]{1,48}$/.test(el.id) && io.observe(el))
    watchSections()

    const onClick = (e: PointerEvent): void => {
      if (clicks.length + sentClicks >= 400) return
      const p = locate(e.clientX, e.clientY, e.target as Element)
      if (!p) return
      clicks.push({ ...p, t: elapsed(), l: label(e.target as Element) })
      dirty = true
    }
    const onMove = (e: PointerEvent): void => {
      if (e.pointerType !== 'mouse' || moves.length + sentMoves >= 4000) return
      const t = now()
      if (t - lastMove < MOVE_MS) return
      lastMove = t
      const p = locate(e.clientX, e.clientY, e.target as Element)
      if (p) moves.push(p)
    }

    const payload = (): string => {
      settleSections()
      return JSON.stringify({
        key,
        visitorId,
        device,
        vw: Math.min(8000, Math.max(200, window.innerWidth)),
        vh: Math.min(8000, Math.max(200, window.innerHeight)),
        lang: lang === 'he' || lang === 'en' ? lang : undefined,
        ref: document.referrer && !document.referrer.includes(location.host) ? document.referrer.slice(0, 300) : undefined,
        durationMs: Math.min(6 * 3600_000 - 1, elapsed()),
        maxScroll,
        sections: Object.fromEntries(Object.entries(sections).slice(0, 40)),
        clicks: clicks.slice(0, 60),
        moves: moves.slice(0, 400),
      })
    }
    const url = `/api/public/offers/${encodeURIComponent(slug)}/track`
    const flush = (final = false): void => {
      if (!dirty && !clicks.length && !moves.length && !final) return
      const body = payload()
      const c = Math.min(clicks.length, 60)
      const m = Math.min(moves.length, 400)
      clicks = clicks.slice(c)
      moves = moves.slice(m)
      sentClicks += c
      sentMoves += m
      dirty = false
      if (final && navigator.sendBeacon?.(url, new Blob([body], { type: 'application/json' }))) return
      fetch(url, { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true }).catch(() => undefined)
    }

    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') {
        if (visibleSince !== null) visibleMs += now() - visibleSince
        visibleSince = null
        flush(true)
        settleSections()
        inView.clear()
      } else {
        visibleSince = now()
        watchSections() // re-observe so sections on screen start counting again
      }
    }

    scroll()
    window.addEventListener('scroll', scroll, { passive: true })
    window.addEventListener('pointerdown', onClick, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    const onHide = (): void => flush(true)
    window.addEventListener('pagehide', onHide)
    const first = window.setTimeout(() => flush(), 1500)
    const timer = window.setInterval(() => document.visibilityState === 'visible' && flush(), FLUSH_MS)
    return () => {
      flush(true)
      window.clearTimeout(first)
      window.clearInterval(timer)
      io.disconnect()
      window.removeEventListener('scroll', scroll)
      window.removeEventListener('pointerdown', onClick)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onHide)
    }
  }, [slug, lang])
  return null
}
