'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Database, FileText, Mail, MessageSquare, Sparkles, UserPlus } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { landingContent } from '@/lib/landingContent'

type Node = { id: string; x: number; y: number; label: string; icon: typeof Mail }

// viewBox 0 0 640 300 — nodes are 72px squares
const NODES: Node[] = [
  { id: 'lead', x: 70, y: 150, label: 'New lead', icon: UserPlus },
  { id: 'enrich', x: 230, y: 150, label: 'Enrich (AI)', icon: Sparkles },
  { id: 'crm', x: 390, y: 150, label: 'CRM', icon: Database },
  { id: 'slack', x: 570, y: 56, label: 'Slack', icon: MessageSquare },
  { id: 'email', x: 570, y: 150, label: 'Email', icon: Mail },
  { id: 'invoice', x: 570, y: 244, label: 'Invoice', icon: FileText },
]

const EDGES: { id: string; d: string; dur: number; begin: number }[] = [
  { id: 'e1', d: 'M 106 150 L 194 150', dur: 1.4, begin: 0 },
  { id: 'e2', d: 'M 266 150 L 354 150', dur: 1.4, begin: 1.4 },
  { id: 'e3', d: 'M 426 150 C 470 150, 490 56, 534 56', dur: 1.5, begin: 2.8 },
  { id: 'e4', d: 'M 426 150 L 534 150', dur: 1.5, begin: 2.8 },
  { id: 'e5', d: 'M 426 150 C 470 150, 490 244, 534 244', dur: 1.5, begin: 2.8 },
]

const CYCLE = 5.2

const NAMES = ['Dana K.', 'Omer L.', 'Noa B.', 'Yossi R.', 'Maya S.', 'Eitan G.']
const COMPANIES = ['Northwind', 'Lumen Labs', 'Kestrel', 'Bloomfield', 'Orbit', 'Sable & Co']

type LogLine = { id: number; t: string; text: string; tone: 'in' | 'ai' | 'ok' }

export function AutomationFlowDemo() {
  const { language } = useLanguage()
  const c = landingContent.capabilities.automation
  const [log, setLog] = useState<LogLine[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [visible, setVisible] = useState(true)
  const hostRef = useRef<HTMLDivElement>(null)
  const counter = useRef(0)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    let run = 0
    const timers: number[] = []

    const push = (text: string, tone: LogLine['tone']) => {
      counter.current += 1
      const now = new Date()
      const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(
        now.getSeconds()
      ).padStart(2, '0')}`
      setLog((prev) => [...prev.slice(-3), { id: counter.current, t, text, tone }])
    }

    const tick = () => {
      const name = NAMES[run % NAMES.length]
      const company = COMPANIES[(run * 3) % COMPANIES.length]
      run += 1

      setActive('lead')
      push(`New lead · ${name} — ${company}`, 'in')

      timers.push(
        window.setTimeout(() => {
          setActive('enrich')
          push(`Enriched · ${company} → 12–50 ppl, SaaS, EU`, 'ai')
        }, 1400)
      )
      timers.push(
        window.setTimeout(() => {
          setActive('crm')
          push(`CRM · deal created (${company})`, 'ok')
        }, 2800)
      )
      timers.push(
        window.setTimeout(() => {
          setActive('fan')
          push(`Slack #sales · Email sent · Invoice drafted`, 'ok')
        }, 4300)
      )
    }

    tick()
    const id = window.setInterval(tick, CYCLE * 1000)
    return () => {
      window.clearInterval(id)
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [visible])

  const isActive = (id: string) =>
    active === id || (active === 'fan' && (id === 'slack' || id === 'email' || id === 'invoice'))

  return (
    <div ref={hostRef} className="grid gap-4">
      {/* Graph */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#040b18] p-3 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.8)] sm:p-5">
        <div className="absolute inset-0 opacity-[0.10] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:22px_22px]" />
        <svg viewBox="0 0 640 300" className="relative mx-auto block h-auto w-full max-w-[720px]" role="img" aria-label="Automation flow">
          <defs>
            <linearGradient id="edge" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="640" y2="0">
              <stop offset="0" stopColor="#4080E0" stopOpacity="0.55" />
              <stop offset="1" stopColor="#80A0E0" stopOpacity="0.9" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {EDGES.map((e) => (
            <g key={e.id}>
              <path id={e.id} d={e.d} fill="none" stroke="url(#edge)" strokeWidth="1.75" strokeDasharray="4 6" />
              {visible && (
                <circle r="4.5" fill="#dbe7ff" filter="url(#glow)">
                  <animateMotion
                    dur={`${e.dur}s`}
                    begin={`${e.begin}s`}
                    repeatCount="indefinite"
                    keyPoints="0;1"
                    keyTimes="0;1"
                    calcMode="linear"
                  >
                    <mpath href={`#${e.id}`} />
                  </animateMotion>
                  <animate
                    attributeName="opacity"
                    values="0;1;1;0"
                    keyTimes="0;0.1;0.9;1"
                    dur={`${CYCLE}s`}
                    begin={`${e.begin}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              )}
            </g>
          ))}

          {NODES.map((n) => {
            const on = isActive(n.id)
            return (
              <g key={n.id} transform={`translate(${n.x} ${n.y})`}>
                {on && (
                  <circle r="46" fill="#4080E0" opacity="0.16">
                    <animate attributeName="r" values="36;56" dur="1.2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.26;0" dur="1.2s" repeatCount="indefinite" />
                  </circle>
                )}
                <rect
                  x="-36"
                  y="-36"
                  width="72"
                  height="72"
                  rx="20"
                  fill={on ? 'rgba(64,128,224,0.24)' : 'rgba(255,255,255,0.035)'}
                  stroke={on ? '#80A0E0' : 'rgba(255,255,255,0.16)'}
                  strokeWidth="1.5"
                  className="transition-all duration-300"
                />
                <foreignObject x="-36" y="-36" width="72" height="72">
                  <div className="flex h-full w-full items-center justify-center">
                    <n.icon
                      className={`h-7 w-7 transition-colors duration-300 ${on ? 'text-white' : 'text-white/65'}`}
                      strokeWidth={1.5}
                    />
                  </div>
                </foreignObject>
                <text
                  y={52}
                  textAnchor="middle"
                  className="font-sans text-[12px] font-medium"
                  style={{ fill: on ? '#ffffff' : 'rgba(255,255,255,0.62)' }}
                >
                  {n.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Live log */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#040b18]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
          <span className="text-xs text-white/55">{c.liveLabel[language]}</span>
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#9ec0f5]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#80A0E0] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#80A0E0]" />
            </span>
            streaming
          </span>
        </div>
        {/* Fixed height + no wrapping: the panel above is sticky-stacked, so any height change here would jolt the page. */}
        <ul className="flex h-[124px] flex-col justify-end gap-1 overflow-hidden px-4 py-3 font-mono text-[12px] leading-5">
          <AnimatePresence initial={false} mode="popLayout">
            {log.map((l) => (
              <motion.li
                key={l.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                transition={{ duration: 0.3 }}
                className="flex min-w-0 gap-3"
              >
                <span className="shrink-0 text-white/30">{l.t}</span>
                <span
                  className={`truncate ${
                    l.tone === 'in' ? 'text-white' : l.tone === 'ai' ? 'text-[#c792ea]' : 'text-[#8fd3b6]'
                  }`}
                >
                  {l.tone === 'in' ? '→ ' : l.tone === 'ai' ? '✦ ' : '✓ '}
                  {l.text}
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  )
}
