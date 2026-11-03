'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, Bell, Check, FileText, Home, LayoutDashboard, Search, Settings, TrendingUp, Users } from 'lucide-react'

/** Design size of the mock; it is scaled down to whatever frame it sits in so it looks the same on phones and desktops. */
const W = 1200
const H = 675

type Screen = 'dashboard' | 'leads' | 'pages' | 'analytics'

const NAV: { id: Screen | 'listings' | 'settings'; label: string; Icon: typeof Home }[] = [
  { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', Icon: Users },
  { id: 'listings', label: 'Listings', Icon: Home },
  { id: 'pages', label: 'Pages', Icon: FileText },
  { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
  { id: 'settings', label: 'Settings', Icon: Settings },
]

const TITLES: Record<Screen, { title: string; sub: string }> = {
  dashboard: { title: 'Good morning.', sub: 'Here is how your website performed in the last 30 days' },
  leads: { title: 'Leads', sub: 'Everyone who asked for a valuation, a showing or a call back' },
  pages: { title: 'Pages', sub: 'Edit and publish your website pages in one click' },
  analytics: { title: 'Analytics', sub: 'Who visits, where they come from and what they do' },
}

const STATS = [
  { label: 'Visitors', value: '12,480', delta: '+18%', line: [6, 8, 7, 10, 9, 12, 11, 14, 13, 16] },
  { label: 'New leads', value: '86', delta: '+24%', line: [4, 5, 5, 7, 6, 9, 8, 11, 10, 13] },
  { label: 'Valuation requests', value: '31', delta: '+12%', line: [3, 4, 3, 5, 6, 5, 7, 7, 8, 9] },
  { label: 'Showings booked', value: '19', delta: '+9%', line: [2, 3, 3, 4, 4, 5, 5, 6, 6, 7] },
]

const SOURCES = [
  { label: 'Google search', pct: 46 },
  { label: 'Instagram', pct: 28 },
  { label: 'WhatsApp', pct: 16 },
  { label: 'Referrals', pct: 10 },
]

const LEADS = [
  { name: 'Dana L.', ask: 'Home valuation', src: 'Google', status: 'New', when: '2 min ago' },
  { name: 'Yossi M.', ask: 'Showing request', src: 'Instagram', status: 'Contacted', when: '1 h ago' },
  { name: 'Noa K.', ask: 'Call back', src: 'WhatsApp', status: 'Booked', when: '3 h ago' },
  { name: 'Eitan R.', ask: 'Home valuation', src: 'Google', status: 'New', when: '5 h ago' },
  { name: 'Maya S.', ask: 'Showing request', src: 'Google', status: 'Contacted', when: 'Yesterday' },
  { name: 'Omer B.', ask: 'Call back', src: 'Referral', status: 'Booked', when: 'Yesterday' },
]

const PAGES = [
  { name: 'Home', slug: '/', views: '3,240', state: 'Published' },
  { name: 'Listings', slug: '/listings', views: '2,115', state: 'Published' },
  { name: 'Neighborhood guide', slug: '/guide', views: '—', state: 'Draft' },
  { name: 'Home valuation', slug: '/valuation', views: '1,308', state: 'Published' },
  { name: 'Contact', slug: '/contact', views: '964', state: 'Published' },
]

const STATUS_STYLE: Record<string, string> = {
  New: 'bg-[#4080E0]/20 text-[#9ec0f5]',
  Contacted: 'bg-amber-400/15 text-amber-200',
  Booked: 'bg-emerald-400/15 text-emerald-200',
  Published: 'bg-emerald-400/15 text-emerald-200',
  Draft: 'bg-white/10 text-white/60',
}

function Sparkline({ points }: { points: number[] }) {
  const max = Math.max(...points)
  const min = Math.min(...points)
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i / (points.length - 1)) * 100},${28 - ((p - min) / (max - min || 1)) * 24}`).join(' ')
  return (
    <svg viewBox="0 0 100 32" className="h-8 w-24" aria-hidden>
      <path d={d} fill="none" stroke="#7fb0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const CHART = [30, 34, 31, 38, 42, 40, 47, 52, 49, 58, 63, 60, 68, 74, 71, 79, 85, 82, 90, 97]

function AreaChart({ id, draw = false }: { id: string; draw?: boolean }) {
  const pts = CHART.map((v, i) => [(i / (CHART.length - 1)) * 560, 150 - (v / 100) * 140] as const)
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  return (
    <svg viewBox="0 0 560 160" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4080E0" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#4080E0" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 80, 120].map((y) => (
        <line key={y} x1="0" x2="560" y1={y} y2={y} stroke="rgba(255,255,255,0.06)" />
      ))}
      <motion.path d={`${line} L560,160 L0,160 Z`} fill={`url(#${id})`} initial={draw ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: draw ? 0.6 : 0 }} />
      <motion.path d={line} fill="none" stroke="#7fb0ff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" initial={draw ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: 'easeOut' }} />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4.5" fill="#fff" />
    </svg>
  )
}

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-white/[0.08] bg-[#061225]/80 p-4 ${className}`}>{children}</div>
)

function Chip({ children, kind, flash }: { children: string; kind: string; flash?: boolean }) {
  return (
    <motion.span
      key={children}
      initial={flash ? { scale: 1.25 } : false}
      animate={{ scale: 1 }}
      className={`inline-block w-fit rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[kind]}`}
    >
      {children}
    </motion.span>
  )
}

function DashboardScreen() {
  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        {STATS.map((s) => (
          <Card key={s.label}>
            <div className="text-[12px] text-white/50">{s.label}</div>
            <div className="mt-1 flex items-end justify-between">
              <div className="text-[28px] font-semibold leading-none tracking-[-0.03em]">{s.value}</div>
              <Sparkline points={s.line} />
            </div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
              <TrendingUp className="h-3 w-3" />
              {s.delta}
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-[1.9fr_1fr] gap-3">
        <Card>
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium">Visitors</span>
            <span className="text-white/45">last 30 days</span>
          </div>
          <div className="mt-2 h-[130px]">
            <AreaChart id="dash-fill" />
          </div>
        </Card>
        <Card>
          <div className="text-[13px] font-medium">Where leads come from</div>
          <div className="mt-3 space-y-2.5">
            {SOURCES.map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-[12px] text-white/65">
                  <span>{s.label}</span>
                  <span>{s.pct}%</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#2f6fd8] to-[#7fb0ff]" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="mt-3 grid grid-cols-[1.9fr_1fr] gap-3">
        <Card>
          <div className="text-[13px] font-medium">Latest leads</div>
          <div className="mt-2 divide-y divide-white/[0.06]">
            {LEADS.slice(0, 4).map((l) => (
              <div key={l.name} className="grid grid-cols-[1.1fr_1.3fr_0.9fr_0.9fr] items-center py-[7px] text-[13px]">
                <span className="font-medium">{l.name}</span>
                <span className="text-white/60">{l.ask}</span>
                <span className="text-white/45">{l.src}</span>
                <Chip kind={l.status}>{l.status}</Chip>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="text-[13px] font-medium">Pages</div>
          <div className="mt-2 divide-y divide-white/[0.06]">
            {PAGES.slice(0, 4).map((p) => (
              <div key={p.name} className="flex items-center justify-between py-[7px] text-[13px]">
                <span className="text-white/75">{p.name}</span>
                <Chip kind={p.state}>{p.state}</Chip>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  )
}

function LeadsScreen({ firstStatus }: { firstStatus: string }) {
  return (
    <>
      <div className="flex items-center gap-2 text-[13px]">
        {[['All', '86', true], ['New', '12'], ['Contacted', '34'], ['Booked', '9']].map(([l, n, on]) => (
          <span key={String(l)} className={`rounded-full border px-3.5 py-1.5 ${on ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 text-white/55'}`}>
            {l} <span className="ml-1 text-white/45">{n}</span>
          </span>
        ))}
        <span className="ml-auto rounded-full bg-white px-4 py-1.5 text-[12px] font-semibold text-[#04101e]">+ Add lead</span>
      </div>
      <Card className="mt-3 !p-0">
        <div className="grid grid-cols-[1.1fr_1.3fr_0.9fr_0.9fr_0.9fr_0.8fr] border-b border-white/[0.08] px-5 py-3 text-[11px] uppercase tracking-[0.12em] text-white/40">
          <span>Name</span>
          <span>Interest</span>
          <span>Source</span>
          <span>Status</span>
          <span>Owner</span>
          <span>Received</span>
        </div>
        <div className="divide-y divide-white/[0.06]">
          {LEADS.map((l, i) => (
            <div key={l.name} className="grid grid-cols-[1.1fr_1.3fr_0.9fr_0.9fr_0.9fr_0.8fr] items-center px-5 py-[13px] text-[13px]">
              <span className="flex items-center gap-2.5 font-medium">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[11px]">{l.name[0]}</span>
                {l.name}
              </span>
              <span className="text-white/60">{l.ask}</span>
              <span className="text-white/45">{l.src}</span>
              <span data-t={i === 0 ? 'lead-status' : undefined}>
                <Chip kind={i === 0 ? firstStatus : l.status} flash={i === 0 && firstStatus !== 'New'}>
                  {i === 0 ? firstStatus : l.status}
                </Chip>
              </span>
              <span className="text-white/45">You</span>
              <span className="text-white/45">{l.when}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

function PagesScreen({ published }: { published: boolean }) {
  return (
    <Card className="!p-0">
      <div className="grid grid-cols-[1.5fr_1fr_0.8fr_0.9fr_1fr] border-b border-white/[0.08] px-5 py-3 text-[11px] uppercase tracking-[0.12em] text-white/40">
        <span>Page</span>
        <span>Address</span>
        <span>Views</span>
        <span>Status</span>
        <span />
      </div>
      <div className="divide-y divide-white/[0.06]">
        {PAGES.map((p) => {
          const isDraft = p.state === 'Draft'
          const state = isDraft && published ? 'Published' : p.state
          return (
            <div key={p.name} className="grid grid-cols-[1.5fr_1fr_0.8fr_0.9fr_1fr] items-center px-5 py-[15px] text-[13px]">
              <span className="font-medium">{p.name}</span>
              <span className="text-white/45">{p.slug}</span>
              <span className="text-white/55">{isDraft && published ? '0' : p.views}</span>
              <span>
                <Chip kind={state} flash={isDraft && published}>
                  {state}
                </Chip>
              </span>
              <span className="flex justify-end gap-2">
                <span className="rounded-lg border border-white/10 px-3 py-1 text-[12px] text-white/70">Edit</span>
                {isDraft && !published && (
                  <span data-t="publish" className="rounded-lg bg-[#2f6fd8] px-3 py-1 text-[12px] font-semibold text-white">
                    Publish
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function AnalyticsScreen() {
  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {[['Visitors', '12,480', '+18%'], ['Average time on site', '2m 41s', '+11%'], ['Lead conversion', '3.8%', '+0.9 pt']].map(([l, v, d]) => (
          <Card key={l}>
            <div className="text-[12px] text-white/50">{l}</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-[26px] font-semibold leading-none tracking-[-0.03em]">{v}</div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                <TrendingUp className="h-3 w-3" />
                {d}
              </span>
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-[1.9fr_1fr] gap-3">
        <Card>
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-medium">Visitors, day by day</span>
            <span className="text-white/45">last 30 days</span>
          </div>
          <div className="mt-2 h-[250px]">
            <AreaChart id="an-fill" draw />
          </div>
        </Card>
        <div className="space-y-3">
          <Card>
            <div className="text-[13px] font-medium">Top pages</div>
            <div className="mt-3 space-y-2.5">
              {[['Home', 74], ['Listings', 52], ['Home valuation', 31]].map(([l, p]) => (
                <div key={String(l)}>
                  <div className="flex justify-between text-[12px] text-white/65">
                    <span>{l}</span>
                    <span>{p}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-white/10">
                    <motion.div className="h-full rounded-full bg-gradient-to-r from-[#2f6fd8] to-[#7fb0ff]" initial={{ width: 0 }} animate={{ width: `${p}%` }} transition={{ duration: 1, delay: 0.3 }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div className="text-[13px] font-medium">Devices</div>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/10">
              <div className="bg-[#4080E0]" style={{ width: '68%' }} />
              <div className="bg-[#9ec0f5]" style={{ width: '26%' }} />
            </div>
            <div className="mt-2 flex justify-between text-[12px] text-white/55">
              <span>Phone 68%</span>
              <span>Desktop 26%</span>
              <span>Tablet 6%</span>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

/** Mouse pointer drawn as an arrow */
function Cursor() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
      <path d="M5 3l14 8-6.2 1.6L9.6 19z" fill="#fff" stroke="#0b1220" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

const LOOP_MS = 21000

/**
 * "After" for the back-end tab: the dashboard an agent runs their site from, as a looping demo where a pointer moves
 * through it on its own (opens Leads, updates a lead, publishes a page, checks Analytics). Sample data only. It plays only
 * while on screen, and stays a still dashboard for visitors who prefer reduced motion.
 */
export function ModernBackend() {
  const hostRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const scaleRef = useRef(1)
  const timers = useRef<number[]>([])
  const [scale, setScale] = useState<number | null>(null)
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [firstStatus, setFirstStatus] = useState('New')
  const [published, setPublished] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [cursor, setCursor] = useState({ x: 780, y: 330, visible: false })
  const [click, setClick] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const measure = () => {
      scaleRef.current = host.clientWidth / W
      setScale(scaleRef.current)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(host)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    /** Centre of an element in the mock's own coordinates */
    const pos = (sel: string): { x: number; y: number } | null => {
      const el = rootRef.current?.querySelector<HTMLElement>(sel)
      const root = rootRef.current
      if (!el || !root) return null
      const e = el.getBoundingClientRect()
      const r = root.getBoundingClientRect()
      const s = scaleRef.current || 1
      return { x: (e.left + e.width / 2 - r.left) / s, y: (e.top + e.height / 2 - r.top) / s }
    }
    const at = (ms: number, fn: () => void) => void timers.current.push(window.setTimeout(fn, ms))
    const moveTo = (sel: string, dx = 0, dy = 0) => {
      const p = pos(sel)
      if (p) setCursor({ x: p.x + dx, y: p.y + dy, visible: true })
    }
    const press = () => setClick((c) => c + 1)
    const showToast = (t: string) => {
      setToast(t)
      at(2200, () => setToast(null))
    }

    const run = () => {
      setScreen('dashboard')
      setFirstStatus('New')
      setPublished(false)
      setToast(null)
      setCursor({ x: 820, y: 360, visible: true })

      at(1200, () => moveTo('[data-t=nav-leads]', 30, 0))
      at(2300, () => { press(); setScreen('leads') })
      at(3800, () => moveTo('[data-t=lead-status]', -10, 0))
      at(4900, () => { press(); setFirstStatus('Contacted'); showToast('Lead marked as contacted') })
      at(7600, () => moveTo('[data-t=nav-pages]', 30, 0))
      at(8600, () => { press(); setScreen('pages') })
      at(10200, () => moveTo('[data-t=publish]'))
      at(11300, () => { press(); setPublished(true); showToast('Page is live on your website') })
      at(14000, () => moveTo('[data-t=nav-analytics]', 30, 0))
      at(15000, () => { press(); setScreen('analytics') })
      at(17400, () => setCursor({ x: 640, y: 380, visible: true }))
      at(18800, () => moveTo('[data-t=nav-dashboard]', 30, 0))
      at(19700, () => { press(); setScreen('dashboard') })
      at(LOOP_MS, () => { timers.current = []; run() })
    }

    const stop = () => {
      timers.current.forEach(window.clearTimeout)
      timers.current = []
    }
    const io = new IntersectionObserver(
      ([e]) => {
        stop()
        if (e.isIntersecting) run()
        else {
          setScreen('dashboard')
          setCursor((c) => ({ ...c, visible: false }))
        }
      },
      { threshold: 0.2 },
    )
    io.observe(host)
    return () => {
      io.disconnect()
      stop()
    }
  }, [])

  const head = TITLES[screen]

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden bg-[#030814]">
      <div
        ref={rootRef}
        className="absolute left-0 top-0 flex origin-top-left text-white"
        style={{ width: W, height: H, transform: `scale(${scale ?? 1})`, opacity: scale === null ? 0 : 1 }}
      >
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-[420px] w-[420px] rounded-full bg-[#4080E0]/25 blur-[110px]" />

        {/* Sidebar */}
        <aside className="relative flex w-[200px] shrink-0 flex-col border-r border-white/[0.08] bg-[#061225]/80 p-5">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-[-0.02em]">
            <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-[#7fb0ff] to-[#2f6fd8]" />
            your agency
          </div>
          <nav className="mt-8 space-y-1">
            {NAV.map(({ id, label, Icon }) => (
              <div
                key={id}
                data-t={`nav-${id}`}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors duration-300 ${screen === id ? 'bg-[#4080E0]/20 text-white' : 'text-white/55'}`}
              >
                <Icon className="h-[18px] w-[18px]" />
                {label}
              </div>
            ))}
          </nav>
          <div className="mt-auto rounded-2xl border border-white/[0.08] bg-white/[0.04] p-3 text-[12px] leading-snug text-white/60">
            <span className="font-display text-[15px] text-[#dbe6ff]">everything in one place</span>
            <br />
            leads, pages and numbers
          </div>
        </aside>

        {/* Main */}
        <main className="relative flex-1 overflow-hidden p-6 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[26px] font-semibold leading-none tracking-[-0.03em]">
                {head.title.replace(/\.$/, '')}
                {head.title.endsWith('.') && <span className="text-[#4080E0]">.</span>}
              </div>
              <div className="mt-1.5 text-[13px] text-white/50">{head.sub}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-white/50">Sample data</span>
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[13px] text-white/45">
                <Search className="h-4 w-4" />
                Search leads, pages…
              </div>
              <Bell className="h-5 w-5 text-white/55" />
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#7fb0ff] to-[#2f6fd8] text-sm font-semibold">A</span>
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={screen} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.28 }} className="mt-5">
              {screen === 'dashboard' && <DashboardScreen />}
              {screen === 'leads' && <LeadsScreen firstStatus={firstStatus} />}
              {screen === 'pages' && <PagesScreen published={published} />}
              {screen === 'analytics' && <AnalyticsScreen />}
            </motion.div>
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-6 right-6 z-20 flex items-center gap-2 rounded-xl border border-emerald-300/30 bg-[#0a1f1a] px-4 py-3 text-[13px] font-medium text-emerald-100 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/25">
                <Check className="h-3 w-3" />
              </span>
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* The pointer, with a ripple when it clicks */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 z-30"
          style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)`, opacity: cursor.visible ? 1 : 0, transition: 'transform 1.05s cubic-bezier(0.22,1,0.36,1), opacity 0.3s' }}
        >
          {click > 0 && (
            <motion.span
              key={click}
              initial={{ scale: 0.3, opacity: 0.7 }}
              animate={{ scale: 1.8, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute -left-4 -top-4 h-8 w-8 rounded-full bg-white/60"
            />
          )}
          <Cursor />
        </div>
      </div>
    </div>
  )
}
