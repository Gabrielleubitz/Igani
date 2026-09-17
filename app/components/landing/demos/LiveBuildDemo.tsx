'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'

type Part = 'card' | 'badge' | 'title' | 'price' | 'features' | 'button' | 'done'

type Line = { text: string; reveal?: Part }

const LINES: Line[] = [
  { text: 'export function PricingCard() {' },
  { text: '  return (' },
  { text: '    <Card glow>', reveal: 'card' },
  { text: '      <Badge>Most popular</Badge>', reveal: 'badge' },
  { text: '      <h3>Launch</h3>', reveal: 'title' },
  { text: '      <Pitch>Idea → live URL</Pitch>', reveal: 'price' },
  { text: '      <Features items={list} />', reveal: 'features' },
  { text: '      <Button>Start</Button>', reveal: 'button' },
  { text: '    </Card>' },
  { text: '  )' },
  { text: '}', reveal: 'done' },
]

const FEATURES = ['Design system', 'Next.js build', 'Launch + 30d support']

const TYPE_MS = 26
const HOLD_MS = 3200
const RESET_MS = 700

/** Naive but pleasant TSX highlighter. */
function highlight(line: string) {
  const tokens: { t: string; c: string }[] = []
  const re =
    /(<\/?[A-Za-z][\w.]*|\/?>|"[^"]*"|\{[^}]*\}|\b(export|function|return)\b|\b[A-Z][A-Za-z]*\b|[a-z][\w-]*(?==)|[(){}=])/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(line))) {
    if (m.index > last) tokens.push({ t: line.slice(last, m.index), c: 'text-white/80' })
    const s = m[0]
    let c = 'text-white/80'
    if (s.startsWith('<') || s === '>' || s === '/>') c = 'text-[#80A0E0]'
    else if (s.startsWith('"')) c = 'text-[#8fd3b6]'
    else if (s.startsWith('{')) c = 'text-[#f0c987]'
    else if (/^(export|function|return)$/.test(s)) c = 'text-[#c792ea]'
    else if (/^[A-Z]/.test(s)) c = 'text-[#9ec0f5]'
    else if (/^[a-z]/.test(s)) c = 'text-[#a8c7f0]'
    else c = 'text-white/50'
    tokens.push({ t: s, c })
    last = m.index + s.length
  }
  if (last < line.length) tokens.push({ t: line.slice(last), c: 'text-white/80' })
  return tokens
}

export function LiveBuildDemo() {
  const total = useMemo(() => LINES.reduce((n, l) => n + l.text.length + 1, 0), [])
  const [typed, setTyped] = useState(0)
  const [cycle, setCycle] = useState(0)
  const [visible, setVisible] = useState(true)
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    if (typed >= total) {
      const t = window.setTimeout(() => {
        setTyped(0)
        setCycle((c) => c + 1)
      }, HOLD_MS + RESET_MS)
      return () => window.clearTimeout(t)
    }
    const t = window.setTimeout(() => setTyped((n) => n + 1), TYPE_MS)
    return () => window.clearTimeout(t)
  }, [typed, total, visible])

  // Derive typed lines + revealed parts
  const { rendered, revealed, activeLine } = useMemo(() => {
    let remaining = typed
    const rendered: { full: string; partial: string; done: boolean }[] = []
    const revealed = new Set<Part>()
    let activeLine = 0
    for (let i = 0; i < LINES.length; i++) {
      const l = LINES[i]
      const len = l.text.length + 1
      if (remaining >= len) {
        rendered.push({ full: l.text, partial: l.text, done: true })
        if (l.reveal) revealed.add(l.reveal)
        remaining -= len
        activeLine = i + 1
      } else if (remaining > 0) {
        rendered.push({ full: l.text, partial: l.text.slice(0, remaining), done: false })
        activeLine = i
        remaining = 0
      } else {
        break
      }
    }
    return { rendered, revealed, activeLine }
  }, [typed])

  const done = revealed.has('done')
  const progress = Math.min(1, typed / total)

  return (
    <div ref={hostRef} className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      {/* Editor */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#040b18] shadow-[0_24px_80px_-32px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
            <span className="ml-3 font-mono text-[11px] text-white/50">pricing-card.tsx</span>
          </div>
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
            <span
              className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-[#28c840]' : 'bg-[#4080E0] animate-pulse'}`}
            />
            {done ? 'deployed' : 'compiling'}
          </span>
        </div>
        <div className="relative h-[292px]">
          <div className="h-full overflow-x-auto overflow-y-hidden px-4 py-3 font-mono text-[12px] leading-6 [scrollbar-width:none] sm:text-[12.5px] [&::-webkit-scrollbar]:hidden">
          {rendered.map((l, i) => (
            <div key={`${cycle}-${i}`} className="flex">
              <span className="w-7 shrink-0 select-none text-right text-white/25">{i + 1}</span>
              <span className="ml-4 whitespace-pre">
                {highlight(l.partial).map((tok, k) => (
                  <span key={k} className={tok.c}>
                    {tok.t}
                  </span>
                ))}
                {!l.done && i === activeLine && (
                  <span className="ml-px inline-block h-[1.1em] w-[7px] translate-y-[3px] animate-pulse bg-[#80A0E0]" />
                )}
              </span>
            </div>
          ))}
          </div>
          {/* Progress rail */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.06]">
            <div
              className="h-full bg-gradient-to-r from-[#4080E0] to-[#80A0E0] transition-[width] duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[radial-gradient(120%_100%_at_50%_0%,#0b1f45_0%,#040b18_60%)] p-5 sm:p-7">
        <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative flex h-full min-h-[292px] items-center justify-center">
          <AnimatePresence>
            {revealed.has('card') && (
              <motion.div
                key={`card-${cycle}`}
                initial={{ opacity: 0, scale: 0.94, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-[300px] rounded-2xl border border-[#4080E0]/40 bg-[#071731]/90 p-6 shadow-[0_0_0_1px_rgba(64,128,224,0.15),0_30px_80px_-30px_rgba(64,128,224,0.7)] backdrop-blur-md"
              >
                <div className="flex min-h-[220px] flex-col">
                  <AnimatePresence>
                    {revealed.has('badge') && (
                      <motion.span
                        key="badge"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex w-fit rounded-full bg-[#4080E0]/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9ec0f5]"
                      >
                        Most popular
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {revealed.has('title') && (
                      <motion.h3
                        key="title"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 text-xl font-semibold tracking-tight text-white"
                      >
                        Launch
                      </motion.h3>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {revealed.has('price') && (
                      <motion.p
                        key="price"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="!mt-1 flex items-baseline gap-1"
                      >
                        <span className="text-2xl font-semibold tracking-tight text-white">Idea → live URL</span>
                      </motion.p>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {revealed.has('features') && (
                      <motion.ul
                        key="features"
                        initial="hidden"
                        animate="show"
                        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
                        className="mt-4 space-y-2"
                      >
                        {FEATURES.map((f) => (
                          <motion.li
                            key={f}
                            variants={{ hidden: { opacity: 0, x: -6 }, show: { opacity: 1, x: 0 } }}
                            className="flex items-center gap-2 text-sm text-white/80"
                          >
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4080E0]/25">
                              <Check className="h-2.5 w-2.5 text-[#9ec0f5]" strokeWidth={3} />
                            </span>
                            {f}
                          </motion.li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                  <AnimatePresence>
                    {revealed.has('button') && (
                      <motion.a
                        key="button"
                        href="/contact"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-auto block w-full rounded-full bg-[#4080E0] py-2.5 text-center text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(64,128,224,0.9)] transition-colors hover:bg-[#5090F0]"
                      >
                        Start
                      </motion.a>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!revealed.has('card') && (
            <div className="font-mono text-xs uppercase tracking-[0.25em] text-white/30">awaiting render…</div>
          )}
        </div>
      </div>
    </div>
  )
}
