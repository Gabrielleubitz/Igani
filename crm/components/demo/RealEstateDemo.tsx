'use client'

import {
  ArrowDown,
  BadgeCheck,
  BarChart3,
  Bed,
  Bell,
  Building2,
  CalendarCheck,
  Check,
  CircleDot,
  ClipboardList,
  Crown,
  Eye,
  EyeOff,
  FileSignature,
  Flame,
  Handshake,
  Headphones,
  Home,
  Landmark,
  Languages,
  ListChecks,
  MapPin,
  Maximize2,
  Megaphone,
  MessageCircle,
  Mic,
  Minimize2,
  MousePointerClick,
  Phone,
  Radio,
  Route,
  Ruler,
  Scale,
  Send,
  Sparkles,
  Star,
  Target,
  Timer,
  TrendingUp,
  UserRound,
  Users,
  Video,
  Wallet,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { GradientChip, IconChip, Tag, type Tone } from '@/components/ui/tone'
import { cn } from '@/lib/utils'

/* Everything here is made-up demo data for a fictional brokerage ("Demo Realty"), to show real-estate leaders what the CRM does. */

const SECTIONS = [
  { id: 'roles', label: 'CEO vs agent' },
  { id: 'recorder', label: 'In-person recorder' },
  { id: 'properties', label: 'Properties on calls' },
  { id: 'meetings', label: 'Private meetings' },
  { id: 'listen', label: 'Listen in live' },
  { id: 'tasks', label: 'Summaries & tasks' },
  { id: 'more', label: 'Everything else' },
] as const

const GLANCE = [
  { id: 'roles', title: 'The CEO sees everything, agents see their own', line: 'Two views of one system: the whole office live, or one agent’s day.' },
  { id: 'recorder', title: 'In-person meetings, recorded on the phone', line: 'Showings and valuations turn into notes and tasks by themselves.' },
  { id: 'properties', title: 'Properties on every call, caught by AI', line: 'Which listings buyers ask about, and why they say no.' },
  { id: 'meetings', title: 'Video meetings that coach the agent', line: 'Your own branded meeting link, scored after every call.' },
  { id: 'listen', title: 'Listen in live and send notes', line: 'Coach during the call, without the client hearing.' },
  { id: 'tasks', title: 'Summaries and tasks, handed out', line: 'Every meeting ends with a recap and work for the right people.' },
]

const KPIS: { label: string; value: number; prefix?: string; suffix?: string; decimals?: number; sub: string; tone: Tone; icon: React.ReactElement }[] = [
  { label: 'Deals closed this quarter', value: 38, sub: '+27% vs last quarter', tone: 'emerald', icon: <Handshake /> },
  { label: 'Commission pipeline', value: 4.2, prefix: '₪', suffix: 'M', decimals: 1, sub: '61 open deals', tone: 'blue', icon: <Wallet /> },
  { label: 'First reply to a new lead', value: 47, suffix: 's', sub: 'was 3h 10m before', tone: 'amber', icon: <Timer /> },
  { label: 'Showings → offers', value: 31, suffix: '%', sub: 'up from 19%', tone: 'violet', icon: <TrendingUp /> },
  { label: 'Calls & meetings reviewed by AI', value: 100, suffix: '%', sub: '1,284 this month', tone: 'sky', icon: <Sparkles /> },
  { label: 'Follow-ups done on time', value: 96, suffix: '%', sub: 'tasks made for the agent', tone: 'teal', icon: <ListChecks /> },
  { label: 'Properties caught on calls', value: 412, sub: 'matched to 89 buyers', tone: 'pink', icon: <Home /> },
  { label: 'Hours of admin saved / agent', value: 9.5, decimals: 1, suffix: ' h/wk', sub: 'notes, summaries, CRM entry', tone: 'orange', icon: <Timer /> },
]

const AGENTS = [
  { name: 'Noa Levi', deals: 9, gci: 412_000, score: 92, calls: 214, tone: 'emerald' as Tone },
  { name: 'Daniel Cohen', deals: 8, gci: 365_000, score: 88, calls: 198, tone: 'blue' as Tone },
  { name: 'Maya Ben-David', deals: 7, gci: 301_000, score: 84, calls: 176, tone: 'violet' as Tone },
  { name: 'Yossi Mizrahi', deals: 5, gci: 228_000, score: 71, calls: 233, tone: 'amber' as Tone },
  { name: 'Tamar Shapiro', deals: 4, gci: 176_000, score: 79, calls: 141, tone: 'pink' as Tone },
]

const ils = (n: number): string => `₪${n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : n}`

/** Counts up once when it scrolls into view. */
function CountUp({ value, decimals = 0, prefix = '', suffix = '' }: { value: number; decimals?: number; prefix?: string; suffix?: string }): React.ReactElement {
  const [n, setN] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const tick = (t: number): void => {
        const p = Math.min((t - start) / 1100, 1)
        setN(value * (1 - Math.pow(1 - p, 3)))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [value])
  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}

/** The plain-language story of a feature: the problem today, what Igani does, what the office gets. */
interface Story {
  before: string
  igani: string
  result: { stat: string; label: string }
}

function Section({ id, n, title, pitch, tone, icon, story, tryIt, children }: { id: string; n?: number; title: string; pitch: string; tone: Tone; icon: React.ReactElement; story?: Story; tryIt?: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section id={id} className="scroll-mt-24 space-y-5">
      <div className="flex items-start gap-4">
        <GradientChip tone={tone}>{icon}</GradientChip>
        <div className="min-w-0">
          {n ? <p className="eyebrow">Feature {n} of 6</p> : null}
          <h2 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] sm:text-[32px]">{title}</h2>
          <p className="mt-2 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-[17px]">{pitch}</p>
        </div>
      </div>
      {story ? (
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div className="rounded-lg border border-rose-500/20 bg-rose-500/[0.06] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-300">Today, without Igani</p>
            <p className="mt-1.5 text-[15px] leading-snug">{story.before}</p>
          </div>
          <div className="rounded-lg border border-primary/25 bg-primary/[0.06] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">With Igani</p>
            <p className="mt-1.5 text-[15px] leading-snug">{story.igani}</p>
          </div>
          <div className="flex min-w-[180px] flex-col justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/[0.07] p-4 md:text-center">
            <p className="text-3xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-300">{story.result.stat}</p>
            <p className="text-sm text-muted-foreground">{story.result.label}</p>
          </div>
        </div>
      ) : null}
      {tryIt ? (
        <p className="flex items-center gap-2 text-sm font-medium text-primary">
          <MousePointerClick className="h-4 w-4" /> Try it: {tryIt}
        </p>
      ) : null}
      {children}
    </section>
  )
}

function Panel({ className, children }: { className?: string; children: React.ReactNode }): React.ReactElement {
  return <div className={cn('rounded-lg border bg-card p-4 shadow-sm sm:p-5', className)}>{children}</div>
}

function Bar({ value, tone = 'bg-primary', className }: { value: number; tone?: string; className?: string }): React.ReactElement {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-700', tone)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

function Avatar({ name, size = 32, tone = 'blue' }: { name: string; size?: number; tone?: Tone }): React.ReactElement {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
  const bg: Record<string, string> = { emerald: 'from-emerald-400 to-emerald-600', blue: 'from-sky-400 to-blue-600', violet: 'from-violet-400 to-indigo-600', amber: 'from-amber-300 to-orange-500', pink: 'from-pink-400 to-rose-600', teal: 'from-teal-300 to-cyan-600' }
  return (
    <span className={cn('flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white', bg[tone] ?? bg.blue)} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </span>
  )
}

/* ---------- 1. what an admin sees vs what an agent sees ---------- */

const ACCESS: { what: string; admin: boolean | string; agent: boolean | string }[] = [
  { what: 'Every lead, deal and listing in the office', admin: true, agent: 'Their own' },
  { what: 'Team leaderboard, deals and commission by agent', admin: true, agent: false },
  { what: 'Listen in on live calls and whisper notes', admin: true, agent: false },
  { what: 'AI score and coaching for every call and meeting', admin: 'Everyone', agent: 'Their own' },
  { what: 'Lead-source ROI (portals, Facebook, signs, referrals)', admin: true, agent: false },
  { what: 'Assign and reassign leads, set routing rules', admin: true, agent: false },
  { what: 'Today: showings, calls to make, follow-ups due', admin: 'Team view', agent: true },
  { what: 'In-person recorder, summaries and auto tasks', admin: true, agent: true },
  { what: 'Their commission and pipeline', admin: 'Everyone’s', agent: 'Their own' },
  { what: 'Export, audit log, team access', admin: true, agent: false },
]

function RolesDemo(): React.ReactElement {
  const [role, setRole] = useState<'admin' | 'agent'>('admin')
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <Panel className="p-0 sm:p-0">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <span>What they see</span>
          <span className="flex w-24 items-center justify-center gap-1">
            <Crown className="h-3.5 w-3.5" /> CEO
          </span>
          <span className="flex w-24 items-center justify-center gap-1">
            <UserRound className="h-3.5 w-3.5" /> Agent
          </span>
        </div>
        <ul className="divide-y">
          {ACCESS.map((a) => (
            <li key={a.what} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-4 py-2.5 text-sm">
              <span>{a.what}</span>
              {[a.admin, a.agent].map((v, i) => (
                <span key={i} className="flex w-24 justify-center text-[13px]">
                  {v === true ? (
                    <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="h-4 w-4" /> Yes
                    </span>
                  ) : v === false ? (
                    <span className="flex items-center gap-1 text-muted-foreground/70">
                      <EyeOff className="h-3.5 w-3.5" /> Hidden
                    </span>
                  ) : (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-center font-medium text-primary">{v}</span>
                  )}
                </span>
              ))}
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold">{role === 'admin' ? 'What the CEO opens in the morning' : 'What Noa (agent) opens in the morning'}</p>
          <div className="flex rounded-full border bg-muted/40 p-1 text-sm" role="tablist">
            {(['admin', 'agent'] as const).map((r) => (
              <button key={r} type="button" role="tab" aria-selected={role === r} onClick={() => setRole(r)} className={cn('rounded-full px-3.5 py-1.5 font-medium transition', role === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {r === 'admin' ? 'CEO view' : 'Agent view'}
              </button>
            ))}
          </div>
        </div>
        {role === 'admin' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                ['Live calls now', '4', 'text-emerald-500'],
                ['Showings today', '17', 'text-sky-500'],
                ['Leads with no reply', '0', 'text-amber-500'],
              ].map(([l, v, c]) => (
                <div key={l} className="rounded-md border bg-muted/30 p-3">
                  <div className={cn('text-2xl font-semibold tabular-nums', c)}>{v}</div>
                  <div className="text-[13px] text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team this quarter</p>
              <ul className="space-y-2">
                {AGENTS.map((a, i) => (
                  <li key={a.name} className="grid grid-cols-[18px_auto_1fr_auto] items-center gap-3 text-sm">
                    <span className="text-[13px] font-semibold text-muted-foreground">{i + 1}</span>
                    <Avatar name={a.name} size={28} tone={a.tone} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{a.name}</span>
                      <Bar value={(a.gci / 412_000) * 100} className="mt-1 h-1.5" tone="bg-gradient-to-r from-sky-400 to-blue-600" />
                    </span>
                    <span className="text-right text-[13px]">
                      <b className="block text-sm tabular-nums">{ils(a.gci)}</b>
                      <span className="text-muted-foreground">
                        {a.deals} deals · call score {a.score}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <b>Heads up:</b> Yossi makes the most calls but books the fewest showings. His calls skip budget questions in 7 of 10 conversations. <span className="font-medium text-primary">Coaching plan ready →</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                ['My showings today', '4', 'text-sky-500'],
                ['Follow-ups due', '6', 'text-amber-500'],
                ['My commission (Q)', '₪412K', 'text-emerald-500'],
              ].map(([l, v, c]) => (
                <div key={l} className="rounded-md border bg-muted/30 p-3">
                  <div className={cn('text-2xl font-semibold tabular-nums', c)}>{v}</div>
                  <div className="text-[13px] text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
            <ul className="space-y-2 text-sm">
              {[
                ['10:00', 'Showing · 18 Ben Yehuda St, apt 7', 'The Katz family · 4 rooms, budget ₪3.4M', 'sky'],
                ['11:30', 'Call back Ronit Azulay', 'Asked about the Florentin loft on yesterday’s call', 'amber'],
                ['13:00', 'Sign exclusive · 5 Weizmann St', 'Contract is drafted from the meeting', 'emerald'],
                ['16:15', 'Showing · 22 Arlozorov St', 'Avi & Lior · pre-approved ₪2.9M', 'sky'],
              ].map(([t, a, b, tone]) => (
                <li key={a} className="flex gap-3 rounded-md border p-3">
                  <span className="w-12 shrink-0 text-[13px] font-semibold tabular-nums text-muted-foreground">{t}</span>
                  <span className="min-w-0">
                    <span className="block font-medium">{a}</span>
                    <span className="block text-[13px] text-muted-foreground">{b}</span>
                  </span>
                  <Tag tone={tone as Tone} className="ml-auto self-start">
                    {tone === 'sky' ? 'Showing' : tone === 'amber' ? 'Call' : 'Signing'}
                  </Tag>
                </li>
              ))}
            </ul>
            <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <EyeOff className="h-3.5 w-3.5" /> Agents never see other agents’ clients, numbers or commission.
            </p>
          </div>
        )}
      </Panel>
    </div>
  )
}

/* ---------- 2. the in-person recorder (like Pocket AI, in the CRM app) ---------- */

const RECORDING = [
  { who: 'Noa', text: 'So this is the living room, about 32 square metres, and the balcony faces west.' },
  { who: 'Client', text: 'It’s bright. What about parking? The place on Dizengoff didn’t have any.' },
  { who: 'Noa', text: 'There’s one spot in the building, registered in the land registry.' },
  { who: 'Client', text: 'Our budget is really 3.4, maybe 3.5 if it’s ready to move in.' },
  { who: 'Noa', text: 'Then you should also see Arlozorov 22, it just dropped to 3.45.' },
]

function RecorderDemo(): React.ReactElement {
  const [shown, setShown] = useState(1)
  const [secs, setSecs] = useState(1122)
  useEffect(() => {
    const t = window.setInterval(() => {
      setSecs((s) => s + 1)
      setShown((n) => (n >= RECORDING.length ? 1 : n + 1))
    }, 1800)
    return () => window.clearInterval(t)
  }, [])
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* the phone */}
      <div className="mx-auto w-[280px] rounded-[44px] border-[10px] border-neutral-900 bg-neutral-950 p-4 text-white shadow-2xl">
        <div className="mx-auto mb-4 h-6 w-24 rounded-full bg-black" />
        <p className="text-center text-[13px] uppercase tracking-[0.2em] text-white/50">Recording meeting</p>
        <p className="mt-1 text-center text-sm font-semibold">Showing · 18 Ben Yehuda St</p>
        <p className="text-center text-[13px] text-white/60">The Katz family · linked to their lead</p>
        <div className="my-5 flex h-16 items-center justify-center gap-[3px]">
          {Array.from({ length: 34 }).map((_, i) => (
            <span key={i} className="w-[3px] animate-pulse rounded-full bg-gradient-to-t from-rose-500 to-orange-300" style={{ height: `${Math.round(18 + Math.abs(Math.sin(i * 1.7 + secs)) * 46)}px`, animationDelay: `${(i % 7) * 0.12}s` }} />
          ))}
        </div>
        <p className="text-center font-mono text-2xl tabular-nums">
          {String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}
        </p>
        <div className="mt-4 h-32 space-y-1.5 overflow-hidden text-[13px] leading-snug">
          {RECORDING.slice(0, shown).map((l, i) => (
            <p key={i} className="animate-in fade-in slide-in-from-bottom-1">
              <b className={l.who === 'Noa' ? 'text-sky-300' : 'text-amber-200'}>{l.who}:</b> <span className="text-white/80">{l.text}</span>
            </p>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-center gap-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
            <MapPin className="h-5 w-5" />
          </span>
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 shadow-lg shadow-rose-500/40">
            <span className="h-6 w-6 rounded-md bg-white" />
          </span>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
            <Bell className="h-5 w-5" />
          </span>
        </div>
      </div>

      {/* what it turns into */}
      <div className="space-y-4">
        <Panel>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="font-semibold">Ready 40 seconds after the meeting ends</p>
            <Tag tone="emerald" className="ml-auto">
              Saved to the Katz family’s lead
            </Tag>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 text-sm">
              <p className="eyebrow">What they want</p>
              <ul className="space-y-1.5">
                {['4 rooms, west light, moving within 3 months', 'Budget ₪3.4M (₪3.5M if move-in ready)', 'Parking is a must, the last place lost them on it', 'Two kids: near Bialik school'].map((x) => (
                  <li key={x} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 text-sm">
              <p className="eyebrow">Next steps (already in the CRM)</p>
              <ul className="space-y-1.5">
                {[
                  ['Book showing at Arlozorov 22', 'Noa · tomorrow'],
                  ['Send the parking registration extract', 'Noa · today'],
                  ['Ask the seller about the price', 'Daniel (listing agent) · today'],
                  ['Intro to mortgage advisor', 'Office assistant · this week'],
                ].map(([a, b]) => (
                  <li key={a} className="flex items-start gap-2">
                    <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      {a}
                      <span className="block text-[13px] text-muted-foreground">{b}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            [<Mic key="i" />, 'One tap on the phone', 'Showings, valuations, coffee meetings. Works offline and uploads later.'],
            [<MapPin key="i" />, 'Knows where you are', 'Links the recording to the property and client by location and calendar.'],
            [<Languages key="i" />, 'Hebrew, English, Russian…', 'Transcribes mixed languages and summarises in the office’s language.'],
          ].map(([icon, a, b]) => (
            <Panel key={a as string} className="p-4">
              <IconChip tone="rose" size="sm">
                {icon}
              </IconChip>
              <p className="mt-2 text-sm font-semibold">{a}</p>
              <p className="text-[13px] text-muted-foreground">{b}</p>
            </Panel>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- 3. properties mentioned on calls ---------- */

const MENTIONED = [
  { address: '22 Arlozorov St, Tel Aviv', spec: '4 rooms · 98 m² · parking', price: 3_450_000, interest: 'Hot', mentions: 7, buyers: 5, tone: 'rose' as Tone },
  { address: '9 Florentin St, loft', spec: '3 rooms · 84 m² · rooftop', price: 2_780_000, interest: 'Warm', mentions: 5, buyers: 3, tone: 'amber' as Tone },
  { address: '5 Weizmann St (new exclusive)', spec: '5 rooms · 132 m² · 2 parking', price: 4_900_000, interest: 'Hot', mentions: 4, buyers: 4, tone: 'rose' as Tone },
  { address: '41 Herzl St, Ramat Gan', spec: '3.5 rooms · 90 m² · elevator', price: 2_350_000, interest: 'Asked about', mentions: 3, buyers: 2, tone: 'sky' as Tone },
]

function PropertiesDemo(): React.ReactElement {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Panel className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-primary" />
          <b>Call with Ronit Azulay</b>
          <span className="text-muted-foreground">· 6 min · Maya</span>
        </div>
        <div className="space-y-2 rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
          <p>
            <b className="text-sky-600 dark:text-sky-300">Maya:</b> Did you get a chance to look at <mark className="rounded bg-amber-300/40 px-1 text-foreground">the loft on Florentin</mark>?
          </p>
          <p>
            <b className="text-amber-700 dark:text-amber-200">Ronit:</b> Yes, loved the roof, but <mark className="rounded bg-rose-300/40 px-1 text-foreground">2.78 is above what we can do</mark>. What about something in <mark className="rounded bg-amber-300/40 px-1 text-foreground">Ramat Gan near Herzl</mark>?
          </p>
          <p>
            <b className="text-sky-600 dark:text-sky-300">Maya:</b> There’s <mark className="rounded bg-amber-300/40 px-1 text-foreground">a 3.5 on Herzl 41 at 2.35</mark>, with an elevator.
          </p>
        </div>
        <p className="eyebrow pt-1">Pulled out of the call</p>
        <div className="space-y-2">
          {[
            ['9 Florentin St, loft', 'Liked it · price objection (₪2.78M too high)', 'amber'],
            ['41 Herzl St, Ramat Gan', 'Wants to see it · fits budget', 'emerald'],
          ].map(([a, b, t]) => (
            <div key={a} className="flex items-center gap-3 rounded-md border p-2.5 text-sm">
              <IconChip tone={t as Tone} size="sm">
                <Building2 />
              </IconChip>
              <span className="min-w-0">
                <span className="block font-medium">{a}</span>
                <span className="block text-[13px] text-muted-foreground">{b}</span>
              </span>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="p-0 sm:p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold">Properties mentioned this week</p>
          <Tag tone="violet">From 312 calls & meetings</Tag>
        </div>
        <ul className="divide-y">
          {MENTIONED.map((p) => (
            <li key={p.address} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 dark:from-slate-700 dark:to-slate-800 dark:text-slate-300">
                <Home className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{p.address}</span>
                <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <Bed className="h-3.5 w-3.5" /> {p.spec}
                </span>
              </span>
              <span className="text-right">
                <b className="block tabular-nums">{ils(p.price)}</b>
                <span className="text-[13px] text-muted-foreground">
                  {p.mentions} mentions · {p.buyers} matching buyers
                </span>
              </span>
              <Tag tone={p.tone}>{p.interest}</Tag>
            </li>
          ))}
        </ul>
        <p className="border-t px-4 py-3 text-[13px] text-muted-foreground">Each property links back to the exact moment in every call it came up, with who asked and what they objected to.</p>
      </Panel>
    </div>
  )
}

/* ---------- 4. private meetings that coach the agent ---------- */

const SCORES = [
  ['Rapport and trust', 91],
  ['Finding needs (budget, timing, must-haves)', 64],
  ['Presenting the property', 88],
  ['Handling objections', 72],
  ['Clear next step booked', 95],
] as const

function MeetingsDemo(): React.ReactElement {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col overflow-hidden rounded-lg bg-[#131314] p-3 text-white shadow-lg">
        <div className="mb-2 flex items-center justify-between text-[13px] text-white/70">
          <span>14:02 | Valuation · 5 Weizmann St</span>
          <span className="flex items-center gap-1.5 rounded-full bg-rose-500/20 px-2 py-0.5 text-rose-200">
            <CircleDot className="h-3 w-3" /> Recording · AI notes on
          </span>
        </div>
        <div className="grid min-h-[200px] flex-1 grid-cols-2 gap-2">
          {[
            ['Tamar Shapiro', 'from-[#3d4b5f] to-[#1d2330]', true],
            ['The Golan family', 'from-[#5d5a3c] to-[#25241b]', false],
          ].map(([n, g, speaking]) => (
            <div key={n as string} className={cn('relative h-full min-h-[200px] rounded-xl bg-gradient-to-br', g as string, speaking && 'ring-[3px] ring-[#c6e48b]')}>
              <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-lg font-semibold">
                {(n as string)
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')}
              </span>
              <span className="absolute bottom-2 left-3 text-[13px] font-medium">{n}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-2">
          {[<Mic key="m" />, <Video key="v" />, <Users key="u" />].map((i, k) => (
            <span key={k} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#333537] [&_svg]:h-4 [&_svg]:w-4">
              {i}
            </span>
          ))}
          <span className="flex h-9 w-14 items-center justify-center rounded-full bg-[#dc362e]">
            <Phone className="h-4 w-4 rotate-[135deg]" />
          </span>
        </div>
        <p className="mt-3 text-center text-[13px] text-white/50">Private, branded video meetings. No Zoom or Google account needed for the client.</p>
      </div>
      <Panel className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar name="Tamar Shapiro" size={40} tone="pink" />
          <div>
            <p className="font-semibold">Tamar’s meeting score</p>
            <p className="text-[13px] text-muted-foreground">Valuation meeting · 38 min · seller signed an exclusive</p>
          </div>
          <span className="ml-auto text-3xl font-semibold tabular-nums text-emerald-500">82</span>
        </div>
        <ul className="space-y-2.5">
          {SCORES.map(([l, v]) => (
            <li key={l} className="text-sm">
              <span className="flex justify-between">
                <span>{l}</span>
                <b className="tabular-nums">{v}</b>
              </span>
              <Bar value={v} tone={v >= 85 ? 'bg-emerald-500' : v >= 70 ? 'bg-sky-500' : 'bg-amber-500'} className="mt-1" />
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-md border p-3">
            <p className="text-[13px] text-muted-foreground">Talk time (agent / client)</p>
            <div className="mt-1.5 flex h-2 overflow-hidden rounded-full">
              <span className="bg-sky-500" style={{ width: '58%' }} />
              <span className="bg-amber-400" style={{ width: '42%' }} />
            </div>
            <p className="mt-1 text-[13px]">58% / 42% · aim under 50%</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-[13px] text-muted-foreground">Questions asked</p>
            <p className="text-lg font-semibold">11</p>
            <p className="text-[13px]">2 about budget (aim 4+)</p>
          </div>
        </div>
        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <b>Coaching note:</b> Great close. Next time, ask when they need the money from the sale before quoting a price. It came up only at minute 31.
        </div>
      </Panel>
    </div>
  )
}

/* ---------- 5. listen in live and pass notes ---------- */

const LIVE = [
  { agent: 'Yossi Mizrahi', who: 'Buyer · Eyal Peretz', mins: 7, topic: 'Asking about Arlozorov 22', tone: 'amber' as Tone },
  { agent: 'Daniel Cohen', who: 'Seller · Weizmann 5', mins: 14, topic: 'Price negotiation', tone: 'blue' as Tone },
  { agent: 'Noa Levi', who: 'Meeting · The Katz family', mins: 22, topic: 'Showing, in person', tone: 'emerald' as Tone },
]

function ListenDemo(): React.ReactElement {
  const [listening, setListening] = useState(0)
  const [note, setNote] = useState('Ask if they’re pre-approved for a mortgage before you go on')
  const [sent, setSent] = useState<string | null>(null)
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Panel className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <p className="font-semibold">Live now</p>
          <span className="text-sm text-muted-foreground">· calls and in-person meetings</span>
        </div>
        <ul className="space-y-2">
          {LIVE.map((c, i) => (
            <li key={c.agent} className={cn('flex items-center gap-3 rounded-md border p-3 text-sm transition', listening === i && 'border-primary/50 bg-primary/5')}>
              <Avatar name={c.agent} size={34} tone={c.tone} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {c.agent} <span className="font-normal text-muted-foreground">↔ {c.who}</span>
                </span>
                <span className="block text-[13px] text-muted-foreground">
                  {c.topic} · {c.mins} min
                </span>
              </span>
              <Button size="sm" variant={listening === i ? 'default' : 'outline'} onClick={() => (setListening(i), setSent(null))}>
                <Headphones className="h-4 w-4" /> {listening === i ? 'Listening' : 'Listen'}
              </Button>
            </li>
          ))}
        </ul>
        <div className="rounded-md bg-muted/40 p-3">
          <p className="mb-2 text-[13px] font-medium text-muted-foreground">Note to {LIVE[listening]!.agent.split(' ')[0]} (only they see it, the client hears nothing)</p>
          <div className="flex gap-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} className="h-9 min-w-0 flex-1 rounded-md border bg-card px-3 text-sm outline-none focus:border-primary" aria-label="Note to the agent" />
            <Button size="sm" onClick={() => setSent(note)} disabled={!note.trim()}>
              <Send className="h-4 w-4" /> Send
            </Button>
          </div>
        </div>
        <ul className="grid grid-cols-3 gap-2 text-center text-[13px] text-muted-foreground">
          <li className="rounded-md border p-2">
            <Eye className="mx-auto mb-1 h-4 w-4" /> Silent, they don’t know
          </li>
          <li className="rounded-md border p-2">
            <Radio className="mx-auto mb-1 h-4 w-4" /> Live transcript as you listen
          </li>
          <li className="rounded-md border p-2">
            <Star className="mx-auto mb-1 h-4 w-4" /> Notes saved for coaching
          </li>
        </ul>
      </Panel>
      <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-lg border bg-gradient-to-br from-slate-100 to-slate-200 p-6 dark:from-slate-900 dark:to-slate-950">
        <p className="absolute left-4 top-3 text-[13px] font-medium text-muted-foreground">What {LIVE[listening]!.agent.split(' ')[0]} sees, mid-call</p>
        <div className="w-full max-w-xs rounded-2xl border bg-card p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
              <Phone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">{LIVE[listening]!.who}</p>
              <p className="text-[13px] text-muted-foreground">On call · {LIVE[listening]!.mins}:12</p>
            </div>
          </div>
          {sent ? (
            <div className="mt-4 animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold text-amber-700 dark:text-amber-300">
                <MessageCircle className="h-3.5 w-3.5" /> Note from your manager
              </p>
              {sent}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed p-3 text-center text-[13px] text-muted-foreground">Send a note and it appears here, on the agent’s screen</p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- 6. meeting summaries and who does what ---------- */

const TASKS = [
  { task: 'Send the Golans the signed exclusive and marketing plan', who: 'Tamar Shapiro', due: 'Today', tone: 'pink' as Tone, done: true },
  { task: 'Book the photographer and drone shoot', who: 'Office assistant', due: 'Tomorrow', tone: 'teal' as Tone, done: true },
  { task: 'List on the portals and the office site', who: 'Marketing', due: 'Thu', tone: 'violet' as Tone, done: false },
  { task: 'Send the 3 matching buyers a first look', who: 'Daniel Cohen', due: 'Thu', tone: 'blue' as Tone, done: false },
  { task: 'Check the building’s permits and liens', who: 'Office lawyer', due: 'Next week', tone: 'amber' as Tone, done: false },
]

function TasksDemo(): React.ReactElement {
  const [done, setDone] = useState(() => TASKS.map((t) => t.done))
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Panel className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="font-semibold">Meeting summary</p>
          <span className="text-[13px] text-muted-foreground">· Valuation · 5 Weizmann St</span>
        </div>
        <p className="text-sm leading-relaxed">
          The Golans agreed to a <b>6-month exclusive at ₪4.9M</b> (they opened at ₪5.3M). They need to sell before buying in Herzliya, so <b>speed matters more than top price</b>. Concerns: the 2019 building violation and a tenant until March.
        </p>
        <div className="grid grid-cols-3 gap-2 text-center text-[13px]">
          <div className="rounded-md border p-2">
            <b className="block text-base">₪4.9M</b>Agreed price
          </div>
          <div className="rounded-md border p-2">
            <b className="block text-base">6 mo</b>Exclusive
          </div>
          <div className="rounded-md border p-2">
            <b className="block text-base">3</b>Buyers matched
          </div>
        </div>
        <div className="rounded-md bg-emerald-500/10 p-3 text-[13px]">
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp recap sent to the client
          </p>
          “Thanks for today! Attached: the signed agreement and our marketing plan. Photos on Thursday at 10:00.”
        </div>
      </Panel>
      <Panel className="p-0 sm:p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold">Tasks handed out automatically</p>
          <Tag tone="emerald">
            {done.filter(Boolean).length} of {TASKS.length} done
          </Tag>
        </div>
        <ul className="divide-y">
          {TASKS.map((t, i) => (
            <li key={t.task} className="flex items-center gap-3 px-4 py-3 text-sm">
              <button
                type="button"
                onClick={() => setDone((d) => d.map((x, j) => (j === i ? !x : x)))}
                aria-label={done[i] ? 'Mark not done' : 'Mark done'}
                className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition', done[i] ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted-foreground/40 hover:border-primary')}
              >
                {done[i] ? <Check className="h-3 w-3" /> : null}
              </button>
              <span className={cn('min-w-0 flex-1', done[i] && 'text-muted-foreground line-through')}>{t.task}</span>
              <span className="flex shrink-0 items-center gap-2">
                <Avatar name={t.who} size={24} tone={t.tone} />
                <span className="hidden w-28 truncate text-[13px] sm:block">{t.who}</span>
                <Tag tone={t.due === 'Today' ? 'rose' : 'slate'}>{t.due}</Tag>
              </span>
            </li>
          ))}
        </ul>
        <p className="border-t px-4 py-3 text-[13px] text-muted-foreground">Everyone gets their task with the meeting context attached. The CEO sees what’s late across the office.</p>
      </Panel>
    </div>
  )
}

/* ---------- 7. everything else they get ---------- */

const MORE: { icon: React.ReactElement; title: string; body: string; stat: string; tone: Tone; group: 'win' | 'run' | 'clients' }[] = [
  { icon: <Route />, title: 'Speed-to-lead routing', group: 'win', body: 'New leads from the portals, Facebook and signs go to the right agent by area, language and load, with a call in under a minute.', stat: '47s average first reply', tone: 'amber' },
  { icon: <Target />, title: 'Buyer ↔ listing matching', group: 'win', body: 'Every buyer’s needs from their calls are matched to every listing, and agents get told when a new one fits.', stat: '89 buyers matched this week', tone: 'pink' },
  { icon: <CalendarCheck />, title: 'Showing scheduler', group: 'clients', body: 'Clients pick a slot online, the seller is notified, reminders go out by WhatsApp and SMS.', stat: '−63% no-shows', tone: 'sky' },
  { icon: <MessageCircle />, title: 'WhatsApp and SMS from the CRM', group: 'clients', body: 'Every message logged on the lead, templates for follow-ups, and replies land with the right agent.', stat: '3× reply rate vs email', tone: 'emerald' },
  { icon: <FileSignature />, title: 'Exclusives and contracts', group: 'run', body: 'Exclusive agreements, brokerage orders and offers drafted from the meeting and signed on the phone.', stat: 'Signed in minutes, not days', tone: 'violet' },
  { icon: <Wallet />, title: 'Commission tracking', group: 'run', body: 'Each deal’s fee, the split between agents and the office, and when it gets paid.', stat: '₪4.2M pipeline in view', tone: 'blue' },
  { icon: <Landmark />, title: 'Mortgage and lawyer hand-off', group: 'clients', body: 'Pass a client to the mortgage advisor or lawyer with the full context, and see where it stands.', stat: 'No deal stuck in limbo', tone: 'teal' },
  { icon: <BarChart3 />, title: 'Seller reports, sent weekly', group: 'clients', body: 'Owners get views, showings and feedback for their property automatically. Fewer “so what’s happening?” calls.', stat: '+41% exclusive renewals', tone: 'indigo' },
  { icon: <Megaphone />, title: 'Lead-source ROI', group: 'win', body: 'What each portal, campaign and sign really brings in: leads, showings, deals and commission.', stat: 'Know where every ₪ goes', tone: 'orange' },
  { icon: <BadgeCheck />, title: 'Coaching and training', group: 'run', body: 'A sales-training library, scored calls and a plan per agent based on what they actually miss.', stat: '+18 pts avg score in 60 days', tone: 'cyan' },
  { icon: <Flame />, title: 'Lost-deal rescue', group: 'win', body: 'Leads gone quiet are spotted early and brought back with a ready-made message.', stat: '1 in 7 revived', tone: 'rose' },
  { icon: <Scale />, title: 'Compliance and audit', group: 'run', body: 'Recordings, consent, who saw what and when. Ready for any dispute about who brought the client.', stat: 'Every action logged', tone: 'slate' },
]

/* ---------- the page ---------- */

export function RealEstateDemo(): React.ReactElement {
  const root = useRef<HTMLDivElement>(null)
  const [full, setFull] = useState(false)
  useEffect(() => {
    const on = (): void => setFull(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  // which section is on screen, for the bar at the top
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const els = SECTIONS.map((x) => document.getElementById(x.id)).filter((x): x is HTMLElement => Boolean(x))
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (seen) setActive(seen.target.id)
      },
      { rootMargin: '-30% 0px -55% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
  const toggleFull = (): void => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void root.current?.requestFullscreen?.().catch(() => undefined)
  }

  return (
    <div ref={root} className={cn('space-y-12 pb-16', full && 'overflow-y-auto bg-background px-6 py-8 sm:px-12')}>
      {/* hero */}
      <header className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-[#0e1626] via-[#14233d] to-[#1d3b6e] p-6 text-white shadow-lg sm:p-10">
        <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/80">Igani CRM · Real estate edition</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">Every call, showing and meeting becomes a next step.</h1>
            <p className="mt-3 max-w-2xl text-[15px] text-white/75 sm:text-base">The CEO sees the whole office. Every agent gets their day planned for them. AI listens, takes the notes, finds the properties and hands out the work.</p>
          </div>
          <Button variant="outline" size="sm" onClick={toggleFull} className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
            {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />} {full ? 'Exit' : 'Present'}
          </Button>
        </div>
        <div className="relative mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {KPIS.map((k) => (
            <div key={k.label} className="rounded-lg border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-white/70 [&_svg]:h-4 [&_svg]:w-4">
                {k.icon}
                <span className="text-[13px]">{k.label}</span>
              </div>
              <div className="mt-2 text-2xl font-semibold sm:text-3xl">
                <CountUp value={k.value} decimals={k.decimals} prefix={k.prefix} suffix={k.suffix} />
              </div>
              <div className="mt-0.5 text-[13px] text-emerald-300/90">{k.sub}</div>
            </div>
          ))}
        </div>
        <p className="relative mt-4 text-[13px] text-white/45">Demo data for a fictional 12-agent brokerage.</p>
      </header>

      {/* the six features at a glance */}
      <section aria-labelledby="glance" className="space-y-4">
        <div>
          <p className="eyebrow">At a glance</p>
          <h2 id="glance" className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[32px]">
            Six things that change how a brokerage works
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GLANCE.map((g, i) => (
            <a key={g.id} href={`#${g.id}`} className="group flex gap-4 rounded-lg border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{i + 1}</span>
              <span className="min-w-0">
                <span className="block font-semibold leading-snug">{g.title}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{g.line}</span>
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  See how <ArrowDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" />
                </span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* the film */}
      <section aria-label="The film" className="grid items-center gap-6 rounded-xl border bg-card p-4 shadow-sm sm:p-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <video src="/demo/real-estate-hype.mp4" poster="/demo/real-estate-hype.jpg" controls playsInline preload="metadata" className="aspect-video w-full rounded-lg bg-black shadow-lg" />
        <div className="space-y-3">
          <p className="eyebrow">The film · 85 seconds</p>
          <h2 className="text-2xl font-semibold tracking-[-0.02em]">The lead you forgot, called back the morning his home hit the market</h2>
          <p className="text-sm text-muted-foreground">How AI turns a brokerage’s old calls, showings and “not right now”s into deals: matching cold leads to new listings, calling new leads in seconds, spotting buying signals, and writing every summary and task.</p>
          <a href="/demo/real-estate-hype.mp4" download className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
            Download the video
          </a>
        </div>
      </section>

      {/* jump links (the current section lights up) */}
      <nav aria-label="Demo sections" className="sticky top-2 z-20 -mx-1 flex gap-1.5 overflow-x-auto rounded-full border bg-card/90 p-1.5 shadow-sm backdrop-blur [scrollbar-width:none]">
        {SECTIONS.map((s, i) => (
          <a key={s.id} href={`#${s.id}`} aria-current={active === s.id ? 'true' : undefined} className={cn('shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition', active === s.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
            {i < 6 ? <span className={cn('mr-1.5 text-[13px]', active === s.id ? 'text-primary-foreground/80' : 'text-primary')}>{i + 1}</span> : null}
            {s.label}
          </a>
        ))}
      </nav>

      <Section
        id="roles"
        n={1}
        title="What the CEO sees vs what an agent sees"
        pitch="One system, two views. Leadership gets the whole office in real time; agents get a focused day and never see each other’s clients or numbers."
        tone="blue"
        icon={<Users />}
        story={{
          before: 'You find out how the month went at the end of the month, and agents dig through everyone’s data to find their own.',
          igani: 'The CEO sees every deal, call and agent live. Each agent opens a screen with only their day and their clients.',
          result: { stat: 'Live', label: 'office numbers, no reports to chase' },
        }}
        tryIt="switch between the CEO view and the agent view"
      >
        <RolesDemo />
      </Section>

      <Section
        id="recorder"
        n={2}
        title="An app that records in-person meetings"
        pitch="Like Pocket AI, but inside the CRM. Agents tap record at a showing or valuation; the summary, the client’s needs and the next steps land on the right lead by themselves."
        tone="rose"
        icon={<Mic />}
        story={{ before: 'What a client says at a showing stays in the agent’s head, and half of it never reaches the CRM.', igani: 'The agent taps record on their phone. The summary, the client’s needs and the next steps land on the lead.', result: { stat: '40 sec', label: 'from goodbye to full notes' } }}
      >
        <RecorderDemo />
      </Section>

      <Section
        id="properties"
        n={3}
        title="Every property mentioned on a call, caught"
        pitch="AI picks out the addresses, prices and reactions from every conversation, so you know which listings are hot, which buyers fit and where the objections are."
        tone="amber"
        icon={<MapPin />}
        story={{ before: 'Nobody knows which listings buyers keep asking about, or why they say no.', igani: 'AI pulls every address, price and reaction out of every call and meeting, and matches them to buyers.', result: { stat: '412', label: 'properties caught this week' } }}
      >
        <PropertiesDemo />
      </Section>

      <Section
        id="meetings"
        n={4}
        title="Private video meetings that coach the agent"
        pitch="Branded meetings like Google Meet, with no outside accounts. Each one is recorded, summarised and scored, so every agent learns from every meeting."
        tone="violet"
        icon={<Video />}
        story={{ before: 'Meetings happen on Zoom, leave nothing behind, and nobody coaches them.', igani: 'Branded meetings on your own link, recorded, summarised and scored for the agent.', result: { stat: '+18 pts', label: 'average agent score in 60 days' } }}
      >
        <MeetingsDemo />
      </Section>

      <Section
        id="listen"
        n={5}
        title="Listen in on live calls and coach in the moment"
        pitch="Managers listen in silently to any live call or meeting and send the agent a note in the moment. The client hears nothing."
        tone="emerald"
        icon={<Headphones />}
        story={{ before: 'A manager hears about a bad call after the client is gone.', igani: 'Listen in silently to any live call and send the agent a note while it still matters.', result: { stat: 'Live', label: 'coaching during the call' } }}
        tryIt="pick a call, type a note and press Send"
      >
        <ListenDemo />
      </Section>

      <Section
        id="tasks"
        n={6}
        title="Meeting summaries and tasks handed out"
        pitch="When a meeting ends, the summary is written, the client gets a recap on WhatsApp, and every task goes to the right person with a due date."
        tone="sky"
        icon={<ListChecks />}
        story={{ before: 'Follow-ups depend on the agent remembering, and clients wait days for a recap.', igani: 'Every meeting ends with a summary, a WhatsApp recap to the client and tasks for the right people.', result: { stat: '96%', label: 'follow-ups done on time' } }}
        tryIt="tick tasks off the list"
      >
        <TasksDemo />
      </Section>

      <Section id="more" title="And everything a brokerage runs on" pitch="The parts that turn a CRM into the office’s operating system." tone="slate" icon={<Building2 />}>
        <div className="space-y-8">
          {(
            [
              ['win', 'Win more deals', 'Turn more leads into showings and offers'],
              ['clients', 'Keep clients and sellers happy', 'Fast answers and no surprises'],
              ['run', 'Run the office', 'Money, paperwork and people'],
            ] as const
          ).map(([g, title, sub]) => (
            <div key={g} className="space-y-3">
              <div className="flex items-baseline gap-3">
                <h3 className="text-lg font-semibold">{title}</h3>
                <span className="text-sm text-muted-foreground">{sub}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {MORE.filter((f) => f.group === g).map((f) => (
                  <Panel key={f.title} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <IconChip tone={f.tone}>{f.icon}</IconChip>
                      <p className="font-semibold leading-snug">{f.title}</p>
                    </div>
                    <p className="flex-1 text-sm text-muted-foreground">{f.body}</p>
                    <p className="text-sm font-semibold text-primary">{f.stat}</p>
                  </Panel>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* the close */}
      <section className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <p className="eyebrow">In the first 90 days</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em]">What changes for the office</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [<Timer key="i" />, 'Leads answered in under a minute', 'not hours'],
            [<Ruler key="i" />, 'Every agent measured the same way', 'on real calls and meetings'],
            [<ListChecks key="i" />, 'No follow-up forgotten', 'tasks write themselves'],
            [<TrendingUp key="i" />, 'More showings turn into offers', 'because the right buyer sees the right home'],
          ].map(([icon, a, b]) => (
            <div key={a as string} className="flex gap-3">
              <IconChip tone="emerald">{icon}</IconChip>
              <div>
                <p className="text-sm font-semibold">{a}</p>
                <p className="text-[13px] text-muted-foreground">{b}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
