'use client'

import {
  Bot,
  CalendarCheck,
  ChartNoAxesCombined,
  FileSignature,
  Globe,
  Handshake,
  LayoutDashboard,
  Megaphone,
  Quote,
  Rocket,
  Search,
  ShoppingBag,
  Smartphone,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface Msg {
  icon: LucideIcon
  title: string
  body: string
  /** Quotes are shown in italics with their author */
  by?: string
}

const PRODUCTS: Msg[] = [
  { icon: Globe, title: 'Websites that sell', body: 'Fast, custom-designed sites built to turn visitors into booked calls.' },
  { icon: CalendarCheck, title: 'Booking systems', body: 'Online booking, deposits and reminders, so clients fill their own calendar.' },
  { icon: ShoppingBag, title: 'E-commerce stores', body: 'Storefronts with checkout, stock and orders managed from one dashboard.' },
  { icon: LayoutDashboard, title: 'Admin dashboards', body: 'Every client gets a back office to edit content, leads and orders themselves.' },
  { icon: Bot, title: 'AI agents', body: 'Assistants that answer leads, qualify them and book the meeting around the clock.' },
  { icon: Workflow, title: 'Automations', body: 'Forms, emails, CRMs and sheets wired together, so nothing is copied by hand.' },
  { icon: Smartphone, title: 'Web apps & SaaS', body: 'From an MVP to a full platform, designed, built and launched by one team.' },
  { icon: Search, title: 'SEO & speed', body: 'Technical SEO, structured data and top Lighthouse scores on every launch.' },
  { icon: Rocket, title: 'Landing pages', body: 'Campaign pages live in days, with tracking and A/B-ready sections.' },
  { icon: Megaphone, title: 'Real estate sites', body: 'Listings, valuations and agent dashboards that bring in seller leads.' },
  { icon: FileSignature, title: 'Offers, signed online', body: 'Send a live proposal page, the client signs, the invoice task is waiting.' },
  { icon: ChartNoAxesCombined, title: 'Analytics built in', body: 'Know which page, campaign and source brings the deals that close.' },
]

const QUOTES: Msg[] = [
  { icon: Quote, title: 'Every no gets you closer to a yes.', body: '', by: 'Sales proverb' },
  { icon: Quote, title: 'The fortune is in the follow-up.', body: '', by: 'Jim Rohn' },
  { icon: Quote, title: 'People don’t buy what you do, they buy why you do it.', body: '', by: 'Simon Sinek' },
  { icon: Quote, title: 'Stop selling. Start helping.', body: '', by: 'Zig Ziglar' },
  { icon: Quote, title: 'Opportunities don’t happen. You create them.', body: '', by: 'Chris Grosser' },
  { icon: Quote, title: 'Make a customer, not a sale.', body: '', by: 'Katherine Barchetti' },
  { icon: Quote, title: 'Your attitude, not your aptitude, will determine your altitude.', body: '', by: 'Zig Ziglar' },
  { icon: Quote, title: 'Success is the sum of small efforts, repeated day in and day out.', body: '', by: 'Robert Collier' },
  { icon: Handshake, title: 'Listen twice as much as you pitch.', body: 'The client tells you what to build. Write it down.', by: 'Igani playbook' },
  { icon: Handshake, title: 'Show, don’t tell.', body: 'A live mockup closes faster than any deck.', by: 'Igani playbook' },
  { icon: Handshake, title: 'Today’s call is next month’s launch.', body: 'Book the next step before you hang up.', by: 'Igani playbook' },
]

function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** A fresh random order on every visit, mixed so it reads product, product, quote, product, product, quote… */
function shuffled(): Msg[] {
  const p = shuffle(PRODUCTS)
  const q = shuffle(QUOTES)
  const out: Msg[] = []
  while (p.length || q.length) {
    if (p.length) out.push(p.shift()!)
    if (p.length) out.push(p.shift()!)
    if (q.length) out.push(q.shift()!)
  }
  return out
}

const VISIBLE = 4
const EVERY_MS = 3800

/**
 * Messages that arrive like texts: each new card slides in at the bottom and pushes the others up;
 * the oldest fades into the top of the panel. Order is shuffled per visit, so no two refreshes look the same.
 */
export function LoginFeed(): React.ReactElement {
  const [items, setItems] = useState<{ id: number; msg: Msg }[]>([])
  const order = useRef<Msg[]>([])
  const next = useRef(0)
  const els = useRef(new Map<number, HTMLDivElement>())
  const tops = useRef(new Map<number, number>())

  useEffect(() => {
    order.current = shuffled()
    const push = (): void => {
      const n = next.current++
      const msg = order.current[n % order.current.length]!
      setItems((list) => [...list, { id: n, msg }].slice(-(VISIBLE + 1)))
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (let i = 0; i < 3; i++) push()
      return
    }
    push()
    const first = window.setTimeout(push, 900)
    const timer = window.setInterval(() => document.visibilityState === 'visible' && push(), EVERY_MS)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [])

  // FLIP: cards that were already on screen glide from their old spot to the new one; new cards rise in.
  useLayoutEffect(() => {
    const seen = new Map<number, number>()
    for (const [id, el] of els.current) {
      el.getAnimations().forEach((a) => a.cancel())
      const top = el.getBoundingClientRect().top
      seen.set(id, top)
      const before = tops.current.get(id)
      if (before === undefined) {
        el.animate([{ opacity: 0, transform: 'translateY(28px) scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
      } else if (before !== top) {
        el.animate([{ transform: `translateY(${before - top}px)` }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
      }
    }
    tops.current = seen
  }, [items])

  return (
    <div className="relative h-[430px] overflow-hidden [mask-image:linear-gradient(180deg,transparent_0%,#000_38%)]">
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3">
        {items.map(({ id, msg }, i) => {
          const age = items.length - 1 - i // 0 = newest
          const Icon = msg.icon
          return (
            <div
              key={id}
              ref={(el) => {
                if (el) els.current.set(id, el)
                else els.current.delete(id)
              }}
              className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/20 backdrop-blur-xl transition-opacity duration-700"
              style={{ opacity: age >= VISIBLE ? 0 : 1 - age * 0.18 }}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className={msg.by && !msg.body ? 'text-[15px] font-medium italic leading-6' : 'font-semibold'}>{msg.by && !msg.body ? `“${msg.title}”` : msg.title}</div>
                  {msg.body ? <p className="mt-0.5 text-sm leading-6 text-white/75">{msg.body}</p> : null}
                  {msg.by ? <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/50">{msg.by}</p> : null}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
