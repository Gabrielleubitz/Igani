'use client'

import { useEffect } from 'react'

/**
 * Visitor analytics for igani.co pages, managed from the CRM (Admin → Website): how far people scroll, how long each
 * section is on screen, where they click and where the mouse goes. Positions are stored relative to the section they
 * happened in, so a heatmap lines up on any screen width.
 *
 * Two modes:
 *  - normal: sends small batches to the CRM (a "simple" text/plain no-cors request, so no preflight).
 *  - ?igani-heatmap=1 inside the CRM's frame: records nothing, waits for the CRM to post the points, and draws the
 *    heat layer inside each section (so it stays put on sections that stick or slide over each other).
 * Team browsers are never recorded: the CRM's "Open page" link adds ?team=1, which this browser then remembers.
 */
const CRM = (): string => (location.hostname === 'localhost' ? 'http://localhost:3100' : 'https://app.igani.co')
/** Who may send heatmap points: the CRM (and the local CRM only while developing locally) */
const crmOrigins = (): string[] => (location.hostname === 'localhost' ? ['https://app.igani.co', 'http://localhost:3100'] : ['https://app.igani.co'])
const FLUSH_MS = 5000
const MOVE_MS = 120
const ID_RE = /^[a-z0-9-]{1,48}$/
const ANCHOR = 'section[id], [id^="sheet-"]'

function uid(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  }
}

function locate(x: number, y: number, target: Element | null): { s: string; x: number; y: number } | null {
  let el = target?.closest(ANCHOR) as HTMLElement | null
  while (el && !ID_RE.test(el.id)) el = el.parentElement?.closest(ANCHOR) as HTMLElement | null
  if (el) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return { s: el.id, x: Math.min(1, Math.max(0, (x - r.left) / r.width)), y: Math.min(1, Math.max(0, (y - r.top) / r.height)) }
  }
  const h = document.documentElement.scrollHeight
  const w = document.documentElement.clientWidth
  return w && h ? { s: 'page', x: Math.min(1, Math.max(0, x / w)), y: Math.min(1, Math.max(0, (y + window.scrollY) / h)) } : null
}

function label(el: Element | null): string | undefined {
  const hit = el?.closest('a,button,[role=button],label,summary,input,select,textarea') as HTMLElement | null
  if (!hit) return undefined
  const aria = hit.getAttribute('aria-label')?.trim()
  const line = (hit.innerText || '').split('\n').map((x) => x.replace(/\s+/g, ' ').trim()).find((x) => x.length > 1)
  const text = aria || line || hit.getAttribute('placeholder')?.trim() || hit.getAttribute('title')?.trim() || ''
  return text ? text.slice(0, 48) : hit.tagName.toLowerCase()
}

/* ───────────────────────── heatmap mode ───────────────────────── */

function palette(): Uint8ClampedArray {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 1
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 256, 0)
  ;[
    [0, 'rgba(0,0,255,0)'],
    [0.2, 'rgb(0,80,255)'],
    [0.4, 'rgb(0,220,255)'],
    [0.6, 'rgb(0,255,90)'],
    [0.8, 'rgb(255,230,0)'],
    [1, 'rgb(255,40,0)'],
  ].forEach(([at, col]) => grad.addColorStop(at as number, col as string))
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 1)
  return g.getImageData(0, 0, 256, 1).data
}

function drawHeat(kind: 'clicks' | 'moves', sections: string[], points: [number, number, number][]): void {
  document.querySelectorAll('canvas[data-igani-heat]').forEach((c) => c.remove())
  const radius = kind === 'clicks' ? 26 : 18
  const alpha = kind === 'clicks' ? 0.22 : Math.max(0.015, Math.min(0.08, 60 / Math.max(1, points.length)))
  const pal = palette()
  // One canvas per section, placed inside it: sticky / sliding sections carry their own heat with them
  const groups = new Map<number, [number, number][]>()
  for (const [k, x, y] of points) {
    const g = groups.get(k) ?? []
    g.push([x, y])
    groups.set(k, g)
  }
  const layers: { ctx: CanvasRenderingContext2D; w: number; h: number }[] = []
  let peak = 1
  for (const [k, pts] of Array.from(groups)) {
    const id = sections[k]
    const host = id === 'page' ? document.body : document.getElementById(id ?? '')
    if (!host) continue
    const w = id === 'page' ? document.documentElement.scrollWidth : host.offsetWidth
    const h = id === 'page' ? Math.min(30000, document.documentElement.scrollHeight) : host.offsetHeight
    if (!w || !h) continue
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative'
    const canvas = document.createElement('canvas')
    canvas.dataset.iganiHeat = '1'
    canvas.width = w
    canvas.height = h
    Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', width: `${w}px`, height: `${h}px`, pointerEvents: 'none', zIndex: '2147483647', opacity: '0.75' })
    host.appendChild(canvas)
    const ctx = canvas.getContext('2d')!
    for (const [x, y] of pts) {
      const px = x * w
      const py = y * h
      const g = ctx.createRadialGradient(px, py, 0, px, py, radius)
      g.addColorStop(0, `rgba(0,0,0,${alpha})`)
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2)
    }
    const img = ctx.getImageData(0, 0, w, h)
    for (let i = 3; i < img.data.length; i += 4) peak = Math.max(peak, img.data[i]!)
    layers.push({ ctx, w, h })
  }
  // colourise with one scale across all sections, so red means the same everywhere
  for (const { ctx, w, h } of layers) {
    const img = ctx.getImageData(0, 0, w, h)
    for (let i = 0; i < img.data.length; i += 4) {
      const a = img.data[i + 3]!
      if (!a) continue
      const v = Math.min(255, Math.round((a / peak) * 255))
      img.data[i] = pal[v * 4]!
      img.data[i + 1] = pal[v * 4 + 1]!
      img.data[i + 2] = pal[v * 4 + 2]!
      img.data[i + 3] = Math.min(220, 40 + v)
    }
    ctx.putImageData(img, 0, 0)
  }
}

/* ───────────────────────── component ───────────────────────── */

export function SiteTracker({ page }: { page: 'home' | 'realestate' }): null {
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const framed = window.top !== window.self

    if (params.get('igani-heatmap') === '1') {
      if (!framed) return
      const onMessage = (e: MessageEvent): void => {
        if (!crmOrigins().includes(e.origin)) return
        const d = e.data as { type?: string; kind?: 'clicks' | 'moves'; sections?: unknown; points?: unknown }
        if (d?.type !== 'igani-heat' || !Array.isArray(d.sections) || !Array.isArray(d.points)) return
        const sections = d.sections.filter((s): s is string => typeof s === 'string' && (s === 'page' || ID_RE.test(s)))
        const points = (d.points as unknown[]).filter((p): p is [number, number, number] => Array.isArray(p) && p.length === 3 && p.every((n) => typeof n === 'number')).slice(0, 30000)
        drawHeat(d.kind === 'moves' ? 'moves' : 'clicks', sections, points)
      }
      window.addEventListener('message', onMessage)
      return () => window.removeEventListener('message', onMessage)
    }

    if (framed) return
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

    const key = uid()
    let visitorId = ''
    try {
      visitorId = localStorage.getItem('igani-visitor') ?? ''
      if (!visitorId) localStorage.setItem('igani-visitor', (visitorId = uid()))
    } catch {
      visitorId = uid()
    }
    const w = window.innerWidth
    const device = w < 640 ? 'phone' : w < 1024 ? 'tablet' : 'desktop'
    const utmSource = params.get('utm_source')?.slice(0, 80) || undefined
    const utmCampaign = params.get('utm_campaign')?.slice(0, 80) || undefined
    const now = (): number => performance.now()
    let visibleMs = 0
    let visibleSince: number | null = document.visibilityState === 'visible' ? now() : null
    let maxScroll = 0
    const sections: Record<string, number> = {}
    const inView = new Map<string, number>()
    let clicks: { s: string; x: number; y: number; t: number; l?: string }[] = []
    let moves: { s: string; x: number; y: number }[] = []
    let dirty = true
    let lastMove = 0
    let sentClicks = 0
    let sentMoves = 0

    const elapsed = (): number => Math.round(visibleMs + (visibleSince !== null ? now() - visibleSince : 0))
    const settle = (): void => {
      const t = now()
      for (const [s, since] of Array.from(inView)) {
        sections[s] = Math.round((sections[s] ?? 0) + (t - since))
        inView.set(s, t)
      }
    }
    const onScroll = (): void => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      const pct = h <= 0 ? 100 : Math.round((window.scrollY / h) * 100)
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
    // Only the outer sections count for time on screen (an inner #work inside #sheet-work would double count)
    const watch = (): void =>
      document.querySelectorAll<HTMLElement>(ANCHOR).forEach((el) => {
        if (ID_RE.test(el.id) && !el.parentElement?.closest(ANCHOR)) io.observe(el)
      })
    watch()

    const onDown = (e: PointerEvent): void => {
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
    const url = `${CRM()}/api/public/site/track`
    const flush = (final = false): void => {
      if (!dirty && !clicks.length && !moves.length && !final) return
      settle()
      const body = JSON.stringify({
        page,
        key,
        visitorId,
        device,
        vw: Math.min(8000, Math.max(200, window.innerWidth)),
        vh: Math.min(8000, Math.max(200, window.innerHeight)),
        lang: document.documentElement.lang?.startsWith('he') ? 'he' : 'en',
        ref: document.referrer && !document.referrer.includes(location.host) ? document.referrer.slice(0, 300) : undefined,
        utmSource,
        utmCampaign,
        durationMs: Math.min(6 * 3600_000 - 1, elapsed()),
        maxScroll,
        sections: Object.fromEntries(Object.entries(sections).slice(0, 40)),
        clicks: clicks.slice(0, 60),
        moves: moves.slice(0, 400),
      })
      const c = Math.min(clicks.length, 60)
      const m = Math.min(moves.length, 400)
      clicks = clicks.slice(c)
      moves = moves.slice(m)
      sentClicks += c
      sentMoves += m
      dirty = false
      const blob = new Blob([body], { type: 'text/plain' })
      if (final && navigator.sendBeacon?.(url, blob)) return
      fetch(url, { method: 'POST', body, mode: 'no-cors', keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => undefined)
    }
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') {
        if (visibleSince !== null) visibleMs += now() - visibleSince
        visibleSince = null
        flush(true)
        settle()
        inView.clear()
      } else {
        visibleSince = now()
        watch()
      }
    }
    const onHide = (): void => flush(true)

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointerdown', onDown, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onHide)
    const first = window.setTimeout(() => flush(), 1500)
    const timer = window.setInterval(() => document.visibilityState === 'visible' && flush(), FLUSH_MS)
    return () => {
      flush(true)
      window.clearTimeout(first)
      window.clearInterval(timer)
      io.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onHide)
    }
  }, [page])
  return null
}
