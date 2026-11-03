'use client'

import { Flame, Monitor, MousePointerClick, Smartphone } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { HeatDevice, OfferInsights } from '@/lib/offer-insights'
import { sectionLabel } from '@/lib/offer-tracking'
import { siteSectionLabel } from '@/lib/site-pages'
import { cn } from '@/lib/utils'

const fmtSecs = (s: number): string => (s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`)
const fmtWhen = (iso: string): string => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))

function Bar({ pct, tone = 'bg-primary' }: { pct: number; tone?: string }): React.ReactElement {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn('h-full rounded-full', tone)} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
    </div>
  )
}

/**
 * Where the heatmap is drawn. Offers: the CRM's own /o/<slug> page (same origin, the layer is injected directly).
 * Website pages: igani.co in a frame, which draws the layer itself when the CRM posts it the points.
 */
export type HeatTarget = { kind: 'local'; url: string } | { kind: 'remote'; url: string; origin: string }

/** What visitors did on a page: reach, attention per section, clicks, recent visits, and a heatmap. */
export function OfferInsightsPanel({ slug, lang, data, target, site = false }: { slug?: string; lang?: string; data: OfferInsights; target?: HeatTarget; site?: boolean }): React.ReactElement {
  const { stats, recent } = data
  const [heatOpen, setHeatOpen] = useState(false)
  const label = site ? siteSectionLabel : sectionLabel
  const heatTarget: HeatTarget = target ?? { kind: 'local', url: `/o/${encodeURIComponent(slug ?? '')}?notrack=1&lang=${lang ?? 'he'}` }
  if (!stats.visits) {
    return site ? (
      <p className="text-sm text-muted-foreground">No visits in this period yet. As soon as people open the page you&apos;ll see how far they read, what they looked at longest and where they clicked.</p>
    ) : (
      <p className="text-sm text-muted-foreground">No client visits yet. Once the client opens their link, you&apos;ll see how far they read, what they looked at longest and where they clicked. Your own visits from the CRM are never counted.</p>
    )
  }
  const maxSecs = Math.max(1, ...stats.sections.map((s) => s.avgSeconds))
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Visits', value: String(stats.visits), sub: stats.lastVisit ? `Last ${fmtWhen(stats.lastVisit.toString())}` : '' },
          { label: 'People', value: String(stats.visitors), sub: stats.returning ? `${stats.returning} came back` : 'No repeat visits yet' },
          { label: 'Avg. time on page', value: fmtSecs(stats.avgSeconds), sub: 'While the page was on screen' },
          { label: 'Avg. read', value: `${stats.avgScroll}%`, sub: 'How far down they scrolled' },
        ].map((t) => (
          <div key={t.label} className="rounded-lg border p-3">
            <div className="text-2xl font-semibold tabular-nums">{t.value}</div>
            <div className="text-xs text-muted-foreground">{t.label}</div>
            {t.sub ? <div className="mt-0.5 text-[11px] text-muted-foreground/80">{t.sub}</div> : null}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">How far they read</h4>
          {stats.reach.map((r) => (
            <div key={r.at} className="grid grid-cols-[4.5rem_1fr_2.5rem] items-center gap-3 text-sm">
              <span className="text-muted-foreground">{r.at === 100 ? 'The end' : `${r.at}%`}</span>
              <Bar pct={r.pct} />
              <span className="text-end tabular-nums">{r.pct}%</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Time per section</h4>
          {stats.sections.length ? (
            stats.sections.map((s) => (
              <div key={s.id} className="grid grid-cols-[9rem_1fr_4.5rem] items-center gap-3 text-sm" title={`${s.seenPct}% of visits looked at this for 2s or more`}>
                <span className="truncate text-muted-foreground">{label(s.id)}</span>
                <Bar pct={(s.avgSeconds / maxSecs) * 100} tone="bg-violet-400" />
                <span className="text-end tabular-nums">{fmtSecs(s.avgSeconds)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Not enough time on any section yet.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Most clicked</h4>
          {stats.topClicks.length ? (
            <ul className="space-y-1 text-sm">
              {stats.topClicks.map((c) => (
                <li key={c.label} className="flex items-center justify-between gap-3 rounded-md border px-3 py-1.5">
                  <span className="truncate">{c.label}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{c.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No clicks on buttons or links yet.</p>
          )}
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Recent visits</h4>
          <ul className="max-h-72 divide-y overflow-y-auto rounded-md border text-sm">
            {recent.map((v) => (
              <li key={v.id} className="flex items-center gap-3 px-3 py-2">
                {v.device === 'phone' ? <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="Phone" /> : <Monitor className="h-4 w-4 shrink-0 text-muted-foreground" aria-label={v.device} />}
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    {fmtWhen(v.startedAt)}
                    {v.returning ? <span className="ms-2 rounded-full bg-emerald-500/15 px-1.5 py-px text-[10px] font-medium text-emerald-300">returning</span> : null}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{[v.country, v.referrer ? `from ${v.referrer}` : null].filter(Boolean).join(' · ') || 'Direct'}</div>
                </div>
                <div className="shrink-0 text-end text-xs tabular-nums text-muted-foreground">
                  <div>{fmtSecs(v.seconds)}</div>
                  <div>
                    {v.scroll}% · {v.clicks} click{v.clicks === 1 ? '' : 's'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold">Heatmap</h4>
          {!heatOpen ? (
            <button type="button" onClick={() => setHeatOpen(true)} className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
              <Flame className="h-4 w-4 text-orange-400" aria-hidden /> Show heatmap
            </button>
          ) : null}
        </div>
        {heatOpen ? <Heatmap target={heatTarget} heat={data.heat} /> : <p className="text-sm text-muted-foreground">See where {site ? 'visitors' : 'clients'} clicked and moved the mouse, drawn on top of the {site ? 'page' : 'offer page'}.</p>}
      </div>
    </div>
  )
}

const WIDTH: Record<HeatDevice, number> = { desktop: 1280, phone: 390 }
const VIEW_H: Record<HeatDevice, number> = { desktop: 800, phone: 760 }

/** Heat colours: transparent → blue → cyan → green → yellow → red. */
function palette(): Uint8ClampedArray {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 1
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 256, 0)
  grad.addColorStop(0.0, 'rgba(0,0,255,0)')
  grad.addColorStop(0.2, 'rgb(0,80,255)')
  grad.addColorStop(0.4, 'rgb(0,220,255)')
  grad.addColorStop(0.6, 'rgb(0,255,90)')
  grad.addColorStop(0.8, 'rgb(255,230,0)')
  grad.addColorStop(1.0, 'rgb(255,40,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 1)
  return g.getImageData(0, 0, 256, 1).data
}

/**
 * The live offer page in a frame (same origin, ?notrack=1) with a heat layer injected into it, so it scrolls with the
 * page. Each point is placed inside the section it was recorded in, at the same fraction of that section.
 */
function Heatmap({ target, heat }: { target: HeatTarget; heat: OfferInsights['heat'] }): React.ReactElement {
  const [device, setDevice] = useState<HeatDevice>(heat.desktop.visits || !heat.phone.visits ? 'desktop' : 'phone')
  const [kind, setKind] = useState<'clicks' | 'moves'>('clicks')
  const [ready, setReady] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const fit = (): void => setScale(Math.min(1, el.clientWidth / WIDTH[device]))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [device])

  useEffect(() => {
    if (!ready || target.kind !== 'remote') return
    // The website draws the layer itself; send it the points (again after late layout, like the local case)
    const post = (): void => frame.current?.contentWindow?.postMessage({ type: 'igani-heat', kind, ...heat[device][kind] }, target.origin)
    const t1 = window.setTimeout(post, 900)
    const t2 = window.setTimeout(post, 3000)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [ready, device, kind, heat, target])

  useEffect(() => {
    if (!ready || target.kind !== 'local') return
    const doc = frame.current?.contentDocument
    if (!doc?.body) return
    const draw = (): void => {
      doc.getElementById('igani-heat')?.remove()
      const W = doc.documentElement.scrollWidth
      const H = Math.min(30000, doc.documentElement.scrollHeight)
      const canvas = doc.createElement('canvas')
      canvas.id = 'igani-heat'
      canvas.width = W
      canvas.height = H
      Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', width: `${W}px`, height: `${H}px`, pointerEvents: 'none', zIndex: '2147483647', mixBlendMode: 'multiply' })
      doc.body.style.position ||= 'relative'
      doc.body.appendChild(canvas)
      const ctx = canvas.getContext('2d')!
      const set = heat[device][kind]
      const rects = set.sections.map((s) => {
        if (s === 'page') return { left: 0, top: 0, width: W, height: H }
        const r = doc.getElementById(s)?.getBoundingClientRect()
        const sy = doc.defaultView?.scrollY ?? 0
        return r ? { left: r.left, top: r.top + sy, width: r.width, height: r.height } : null
      })
      const radius = kind === 'clicks' ? 26 : 18
      const alpha = kind === 'clicks' ? 0.22 : Math.max(0.015, Math.min(0.08, 60 / Math.max(1, set.points.length)))
      for (const [k, x, y] of set.points) {
        const r = rects[k]
        if (!r) continue
        const px = r.left + x * r.width
        const py = r.top + y * r.height
        const g = ctx.createRadialGradient(px, py, 0, px, py, radius)
        g.addColorStop(0, `rgba(0,0,0,${alpha})`)
        g.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2)
      }
      // colourise the accumulated darkness
      const img = ctx.getImageData(0, 0, W, H)
      const pal = palette()
      let peak = 1
      for (let i = 3; i < img.data.length; i += 4) peak = Math.max(peak, img.data[i]!)
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
      canvas.style.mixBlendMode = 'normal'
      canvas.style.opacity = '0.75'
    }
    // give fonts, images and reveal animations a moment, then draw (and once more for late layout shifts)
    const t1 = window.setTimeout(draw, 700)
    const t2 = window.setTimeout(draw, 2500)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [ready, device, kind, heat, target])

  const count = heat[device][kind].points.length
  const tab = (active: boolean): string => cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm', active ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground')
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
          <button type="button" className={tab(device === 'desktop')} onClick={() => (setReady(false), setDevice('desktop'))}>
            <Monitor className="h-4 w-4" aria-hidden /> Desktop <span className="text-xs text-muted-foreground">({heat.desktop.visits})</span>
          </button>
          <button type="button" className={tab(device === 'phone')} onClick={() => (setReady(false), setDevice('phone'))}>
            <Smartphone className="h-4 w-4" aria-hidden /> Phone <span className="text-xs text-muted-foreground">({heat.phone.visits})</span>
          </button>
        </div>
        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
          <button type="button" className={tab(kind === 'clicks')} onClick={() => setKind('clicks')}>
            <MousePointerClick className="h-4 w-4" aria-hidden /> Clicks
          </button>
          <button type="button" className={tab(kind === 'moves')} onClick={() => setKind('moves')} disabled={device === 'phone'} title={device === 'phone' ? 'Phones have no mouse' : undefined}>
            Mouse movement
          </button>
        </div>
        <span className="text-xs text-muted-foreground">{count ? `${count.toLocaleString()} points` : device === 'phone' && kind === 'moves' ? 'Phones have no mouse' : 'Nothing recorded on this device yet'}</span>
      </div>
      <div ref={box} className="overflow-hidden rounded-lg border bg-white">
        <div style={{ width: WIDTH[device] * scale, height: VIEW_H[device] * scale }} className="mx-auto">
          <iframe
            key={device}
            ref={frame}
            title="Offer page heatmap"
            src={target.url}
            onLoad={() => setReady(true)}
            style={{ width: WIDTH[device], height: VIEW_H[device], transform: `scale(${scale})`, transformOrigin: '0 0', border: 0 }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Scroll inside the page to see the whole heatmap. Red is where most of it happened.</p>
    </div>
  )
}
