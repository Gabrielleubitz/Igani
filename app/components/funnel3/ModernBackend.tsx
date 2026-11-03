'use client'

import { useEffect, useRef, useState } from 'react'
import { BarChart3, Bell, FileText, Home, LayoutDashboard, Search, Settings, TrendingUp, Users } from 'lucide-react'

/** Design size of the mock; it is scaled down to whatever frame it sits in so it looks the same on phones and desktops. */
const W = 1200
const H = 675

const NAV = [
  { label: 'Dashboard', Icon: LayoutDashboard, active: true },
  { label: 'Leads', Icon: Users },
  { label: 'Listings', Icon: Home },
  { label: 'Pages', Icon: FileText },
  { label: 'Analytics', Icon: BarChart3 },
  { label: 'Settings', Icon: Settings },
]

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
  { name: 'Dana L.', ask: 'Home valuation', src: 'Google', status: 'New' },
  { name: 'Yossi M.', ask: 'Showing request', src: 'Instagram', status: 'Contacted' },
  { name: 'Noa K.', ask: 'Call back', src: 'WhatsApp', status: 'Booked' },
  { name: 'Eitan R.', ask: 'Home valuation', src: 'Google', status: 'New' },
]

const PAGES = [
  { name: 'Home', state: 'Published' },
  { name: 'Listings', state: 'Published' },
  { name: 'Neighborhood guide', state: 'Draft' },
  { name: 'Home valuation', state: 'Published' },
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

function VisitorsChart() {
  const max = 100
  const pts = CHART.map((v, i) => [(i / (CHART.length - 1)) * 560, 150 - (v / max) * 140] as const)
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  return (
    <svg viewBox="0 0 560 160" className="h-full w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="vc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4080E0" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#4080E0" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 80, 120].map((y) => (
        <line key={y} x1="0" x2="560" y1={y} y2={y} stroke="rgba(255,255,255,0.06)" />
      ))}
      <path d={`${line} L560,160 L0,160 Z`} fill="url(#vc-fill)" />
      <path d={line} fill="none" stroke="#7fb0ff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="4.5" fill="#fff" />
    </svg>
  )
}

/** "After" for the back-end tab: the dashboard an agent runs their site from. Sample data only. */
export function ModernBackend() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState<number | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const measure = () => setScale(host.clientWidth / W)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(host)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={hostRef} className="absolute inset-0 overflow-hidden bg-[#030814]">
      <div
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
            {NAV.map(({ label, Icon, active }) => (
              <div key={label} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] ${active ? 'bg-[#4080E0]/20 text-white' : 'text-white/55'}`}>
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
        <main className="relative flex-1 p-6 pb-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[26px] font-semibold leading-none tracking-[-0.03em]">
                Good morning<span className="text-[#4080E0]">.</span>
              </div>
              <div className="mt-1.5 text-[13px] text-white/50">Here is how your website performed in the last 30 days</div>
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

          <div className="mt-5 grid grid-cols-4 gap-3">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/[0.08] bg-[#061225]/80 p-4">
                <div className="text-[12px] text-white/50">{s.label}</div>
                <div className="mt-1 flex items-end justify-between">
                  <div className="text-[28px] font-semibold leading-none tracking-[-0.03em]">{s.value}</div>
                  <Sparkline points={s.line} />
                </div>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
                  <TrendingUp className="h-3 w-3" />
                  {s.delta}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-[1.9fr_1fr] gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-[#061225]/80 p-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium">Visitors</span>
                <span className="text-white/45">last 30 days</span>
              </div>
              <div className="mt-2 h-[130px]">
                <VisitorsChart />
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#061225]/80 p-4">
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
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[1.9fr_1fr] gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-[#061225]/80 p-4">
              <div className="text-[13px] font-medium">Latest leads</div>
              <div className="mt-2 divide-y divide-white/[0.06]">
                {LEADS.map((l) => (
                  <div key={l.name} className="grid grid-cols-[1.1fr_1.3fr_0.9fr_0.9fr] items-center py-[7px] text-[13px]">
                    <span className="font-medium">{l.name}</span>
                    <span className="text-white/60">{l.ask}</span>
                    <span className="text-white/45">{l.src}</span>
                    <span className={`w-fit rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[l.status]}`}>{l.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#061225]/80 p-4">
              <div className="text-[13px] font-medium">Pages</div>
              <div className="mt-2 divide-y divide-white/[0.06]">
                {PAGES.map((p) => (
                  <div key={p.name} className="flex items-center justify-between py-[7px] text-[13px]">
                    <span className="text-white/75">{p.name}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[p.state]}`}>{p.state}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
