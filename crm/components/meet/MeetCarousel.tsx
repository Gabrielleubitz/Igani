'use client'

import { Check, ChevronLeft, ChevronRight, Cloud, Link2, Play, Send, X } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion, type Transition } from 'motion/react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { MeetMark } from './MeetMark'

/** Seconds per slide. Every scene's animation loops on this same beat so it's always mid-story when you look. */
const T = 7

const SLIDES = [
  { title: 'Get a link you can share', body: 'Click New meeting to get a link you can send to the people you want to meet with.', Scene: ShareScene },
  { title: 'Your meeting is safe', body: 'No one can join unless the host invites them: every guest gets their own personal link.', Scene: SafeScene },
  { title: 'Looks and sounds like Igani', body: 'Your logo, your colours and Igani’s own sounds, with photos of everyone in the call.', Scene: BrandScene },
  { title: 'Record and replay', body: 'Hosts can record a call and watch or download it afterwards right here.', Scene: RecordScene },
]

const PEOPLE = [
  { i: 'GL', g: 'from-[#8DB6F7] to-[#4f7fd6]' },
  { i: 'DA', g: 'from-[#3fd2c7] to-[#1f8a9c]' },
  { i: 'MR', g: 'from-[#a594ff] to-[#5b4bd1]' },
  { i: 'SK', g: 'from-[#f6b17a] to-[#d0694a]' },
]

/** A keyframed animation that repeats every T seconds. `times` are fractions of the beat. */
function beat(times: number[], ease: Transition['ease'] = 'easeInOut'): Transition {
  return { duration: T, times, repeat: Infinity, ease }
}

/** Places a child centred on (x, y) inside the 340px stage, leaving its transform free for Motion. */
function At({ x, y, children, className }: { x: number; y: number; children: React.ReactNode; className?: string }): React.ReactElement {
  return (
    <div className={cn('absolute', className)} style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}>
      {children}
    </div>
  )
}

function Face({ p, size = 40, className }: { p: (typeof PEOPLE)[number]; size?: number; className?: string }): React.ReactElement {
  return (
    <span className={cn('flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white shadow-lg ring-2 ring-[#0f1a2d]', p.g, className)} style={{ width: size, height: size, fontSize: size * 0.32 }}>
      {p.i}
    </span>
  )
}

/* ---------------------------------------------------------------- scenes */

/** A meeting card types out its link, gets copied, and paper planes carry it to three people. */
function ShareScene(): React.ReactElement {
  const spots = [
    { x: 68, y: 74, p: PEOPLE[1]!, at: 0.5 },
    { x: 272, y: 80, p: PEOPLE[2]!, at: 0.56 },
    { x: 170, y: 292, p: PEOPLE[3]!, at: 0.62 },
  ]
  return (
    <>
      {spots.map((s) => (
        <At key={s.p.i} x={s.x} y={s.y}>
          <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: 0.15, bounce: 0.5 }} className="relative">
            <motion.span className="absolute -inset-1.5 rounded-full border-2 border-[#81c995]" animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.8, 0.8, 1, 1, 1] }} transition={beat([0, s.at + 0.1, s.at + 0.14, 0.94, 1])} />
            <Face p={s.p} size={42} />
            <motion.span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#81c995] text-[#0f1a2d] ring-2 ring-[#0f1a2d]" animate={{ scale: [0, 0, 1.25, 1, 1, 0] }} transition={beat([0, s.at + 0.11, s.at + 0.15, s.at + 0.18, 0.94, 1])}>
              <Check className="h-3 w-3" strokeWidth={3.5} />
            </motion.span>
          </motion.div>
        </At>
      ))}

      {/* paper planes, launched from the card */}
      {spots.map((s) => {
        const dx = s.x - 170
        const dy = s.y - 170
        return (
          <At key={`plane-${s.p.i}`} x={170} y={170}>
            <motion.span
              className="block text-[#a8c7fa] drop-shadow-[0_0_8px_rgba(168,199,250,0.8)]"
              animate={{ x: [0, 0, dx * 0.5 + dy * 0.25, dx], y: [0, 0, dy * 0.5 - 30, dy], opacity: [0, 0, 1, 0], rotate: [0, 0, Math.atan2(dy, dx) * (180 / Math.PI) + 45, Math.atan2(dy, dx) * (180 / Math.PI) + 45], scale: [0.4, 0.4, 1, 0.6] }}
              transition={beat([0, s.at - 0.08, s.at - 0.02, s.at + 0.1], 'easeOut')}
            >
              <Send className="h-5 w-5" />
            </motion.span>
          </At>
        )
      })}

      <At x={170} y={172}>
        <motion.div initial={{ y: 16, opacity: 0, scale: 0.94 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', bounce: 0.35, delay: 0.05 }} className="w-[212px] rounded-2xl border border-white/10 bg-[#16233a]/90 p-3.5 text-left shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex items-center gap-2">
            <MeetMark className="h-6 w-5" slot="#16233a" />
            <span className="text-[13px] font-medium text-[#e3e8f0]">Weekly sync</span>
            <span className="ml-auto rounded-full bg-[#81c995]/15 px-2 py-0.5 text-[10px] font-medium text-[#81c995]">Now</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#0b1322] px-2.5 py-2 text-[11px] text-[#c4cbd6]">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-[#a8c7fa]" />
            <motion.span className="block overflow-hidden whitespace-nowrap" animate={{ maxWidth: [0, 0, 162, 162, 0] }} transition={beat([0, 0.06, 0.3, 0.95, 1], 'linear')}>
              meet.igani.co/kq7-m2x
            </motion.span>
            <motion.span className="h-3.5 w-px bg-[#a8c7fa]" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
          </div>
          <div className="relative mt-2.5 flex justify-end">
            <motion.span
              className="relative flex h-7 items-center gap-1.5 overflow-hidden rounded-full px-3 text-[11px] font-medium"
              animate={{ backgroundColor: ['#a8c7fa', '#a8c7fa', '#81c995', '#81c995', '#a8c7fa'], scale: [1, 1, 0.9, 1, 1] }}
              transition={beat([0, 0.36, 0.39, 0.42, 1])}
            >
              <motion.span className="flex items-center gap-1 text-[#062e6f]" animate={{ opacity: [1, 1, 0, 0, 1], y: [0, 0, -8, -8, 0] }} transition={beat([0, 0.37, 0.4, 0.97, 1])}>
                <Link2 className="h-3 w-3" /> Copy link
              </motion.span>
              <motion.span className="absolute inset-0 flex items-center justify-center gap-1 text-[#0f2a17]" animate={{ opacity: [0, 0, 1, 1, 0], y: [8, 8, 0, 0, 8] }} transition={beat([0, 0.38, 0.41, 0.95, 1])}>
                <Check className="h-3 w-3" strokeWidth={3} /> Copied
              </motion.span>
            </motion.span>
            {/* the pointer that clicks Copy */}
            <motion.svg viewBox="0 0 24 24" className="pointer-events-none absolute right-6 top-3 h-5 w-5 drop-shadow-lg" animate={{ x: [60, 60, 0, 0, 0, 40], y: [50, 50, 0, 0, 0, 40], scale: [1, 1, 1, 0.8, 1, 1], opacity: [0, 0, 1, 1, 1, 0] }} transition={beat([0, 0.18, 0.33, 0.37, 0.42, 0.55])}>
              <path d="M5 3l14 8-6 1.6L10 19z" fill="#fff" stroke="#0f1a2d" strokeWidth="1.5" strokeLinejoin="round" />
            </motion.svg>
          </div>
        </motion.div>
      </At>
    </>
  )
}

/** A shield draws itself around Igani; the invited guest is let in, a stranger bounces off. */
function SafeScene(): React.ReactElement {
  const shield = 'M75 6 L140 30 V86 C140 128 112 156 75 170 C38 156 10 128 10 86 V30 Z'
  return (
    <>
      {[0, 1, 2].map((k) => (
        <At key={k} x={170} y={170}>
          <motion.span className="block h-44 w-44 rounded-full border border-[#a8c7fa]/40" animate={{ scale: [0.7, 1.7], opacity: [0.6, 0] }} transition={{ duration: 3, repeat: Infinity, delay: k, ease: 'easeOut' }} />
        </At>
      ))}

      <At x={170} y={170}>
        <div className="relative h-[176px] w-[150px]">
          <svg viewBox="0 0 150 176" className="absolute inset-0 h-full w-full overflow-visible">
            <defs>
              <linearGradient id="meet-shield" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#1f3456" />
                <stop offset="1" stopColor="#131f35" />
              </linearGradient>
            </defs>
            <motion.path d={shield} fill="url(#meet-shield)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }} />
            <motion.path
              d={shield}
              fill="none"
              strokeWidth="3.5"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1, stroke: ['#8DB6F7', '#8DB6F7', '#81c995', '#8DB6F7', '#8DB6F7', '#f28b82', '#8DB6F7'] }}
              transition={{ pathLength: { duration: 1.1, ease: 'easeInOut' }, stroke: beat([0, 0.4, 0.44, 0.55, 0.72, 0.75, 0.85]) }}
              style={{ filter: 'drop-shadow(0 0 10px rgba(141,182,247,0.55))' }}
            />
          </svg>
          <motion.div className="absolute inset-0 flex items-center justify-center pb-3" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: 0.6, bounce: 0.5 }}>
            <MeetMark className="h-16 w-14" slot="#1a2c4a" />
          </motion.div>
          {/* "welcome" burst when the invited guest gets in */}
          <motion.span className="absolute left-1/2 top-[44%] -ml-5 -mt-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#81c995] text-[#0f2a17] shadow-[0_0_30px_rgba(129,201,149,0.7)]" animate={{ scale: [0, 0, 1.2, 1, 0], opacity: [0, 0, 1, 1, 0] }} transition={beat([0, 0.4, 0.45, 0.55, 0.62])}>
            <Check className="h-5 w-5" strokeWidth={3} />
          </motion.span>
        </div>
      </At>

      {/* invited guest walks in from the left holding their personal link */}
      <At x={58} y={150}>
        <motion.div className="flex flex-col items-center gap-1.5" animate={{ x: [-90, -90, 0, 0, 105, 105], opacity: [0, 0, 1, 1, 0, 0], scale: [1, 1, 1, 1, 0.4, 0.4] }} transition={beat([0, 0.04, 0.18, 0.3, 0.42, 1])}>
          <Face p={PEOPLE[1]!} size={40} />
          <span className="flex items-center gap-1 rounded-full bg-[#81c995]/15 px-2 py-0.5 text-[10px] font-medium text-[#81c995] ring-1 ring-[#81c995]/30">
            <Link2 className="h-2.5 w-2.5" /> Invited
          </span>
        </motion.div>
      </At>

      {/* a stranger tries from the right and bounces off */}
      <At x={272} y={200}>
        <motion.div className="relative flex flex-col items-center gap-1.5" animate={{ x: [90, 90, 0, -18, 14, 14, 90], opacity: [0, 0, 1, 1, 1, 1, 0], rotate: [0, 0, 0, -8, 6, 0, 0] }} transition={beat([0, 0.55, 0.68, 0.74, 0.8, 0.9, 1])}>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3a4456] text-sm font-semibold text-[#9aa4b2] ring-2 ring-[#0f1a2d]">?</span>
          <motion.span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#f28b82] text-[#3b0d0a] ring-2 ring-[#0f1a2d]" animate={{ scale: [0, 0, 1.3, 1, 0] }} transition={beat([0, 0.74, 0.77, 0.86, 0.95])}>
            <X className="h-3 w-3" strokeWidth={3.5} />
          </motion.span>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[#9aa4b2] ring-1 ring-white/10">No link</span>
        </motion.div>
      </At>
    </>
  )
}

/** A little call in Igani colours: the speaker's ring moves around, people rings stack in, and the logo sings. */
function BrandScene(): React.ReactElement {
  return (
    <>
      <At x={170} y={140}>
        <motion.div initial={{ y: 20, opacity: 0, rotateX: 20 }} animate={{ y: 0, opacity: 1, rotateX: 0 }} transition={{ type: 'spring', bounce: 0.3 }} className="w-[236px] rounded-2xl border border-white/10 bg-[#141f33] p-2 shadow-2xl shadow-black/50" style={{ transformPerspective: 600 }}>
          <div className="mb-2 flex items-center gap-1.5 px-1">
            <MeetMark className="h-3.5 w-3" slot="#141f33" />
            <span className="text-[10px] font-medium text-[#c4cbd6]">Igani Meet</span>
            <span className="ml-auto flex -space-x-1.5">
              {PEOPLE.slice(0, 3).map((p, k) => (
                <motion.span key={p.i} className="rounded-full bg-gradient-to-br from-[#8DB6F7] to-[#4f7fd6] p-[1.5px]" animate={{ scale: [0, 0, 1.15, 1, 1, 0], opacity: [0, 0, 1, 1, 1, 0] }} transition={beat([0, 0.08 + k * 0.06, 0.12 + k * 0.06, 0.15 + k * 0.06, 0.94, 1])}>
                  <Face p={p} size={18} className="ring-1" />
                </motion.span>
              ))}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {PEOPLE.map((p, k) => (
              <div key={p.i} className="relative flex h-[62px] items-center justify-center overflow-hidden rounded-lg bg-[#1d2a42]">
                <div className={cn('absolute inset-0 bg-gradient-to-br opacity-20', p.g)} />
                <Face p={p} size={30} />
                <motion.span className="absolute inset-0 rounded-lg ring-2 ring-inset ring-[#81c995]" animate={{ opacity: [0, 0, 1, 1, 0, 0] }} transition={beat([0, k * 0.25, k * 0.25 + 0.02, k * 0.25 + 0.22, k * 0.25 + 0.24, 1])} />
                <motion.span className="absolute bottom-1 right-1 flex items-end gap-[2px]" animate={{ opacity: [0, 0, 1, 1, 0, 0] }} transition={beat([0, k * 0.25, k * 0.25 + 0.02, k * 0.25 + 0.22, k * 0.25 + 0.24, 1])}>
                  {[0, 1, 2].map((b) => (
                    <motion.span key={b} className="w-[3px] rounded-full bg-[#81c995]" animate={{ height: [3, 9, 4, 7, 3] }} transition={{ duration: 0.7, repeat: Infinity, delay: b * 0.12 }} />
                  ))}
                </motion.span>
              </div>
            ))}
          </div>
        </motion.div>
      </At>

      {/* the logo, singing: sound arcs and notes */}
      <At x={170} y={268}>
        <div className="relative">
          {[0, 1, 2].map((k) => (
            <motion.span key={k} className="absolute left-1/2 top-1/2 -ml-8 -mt-8 h-16 w-16 rounded-full border-2 border-[#8DB6F7]/50" animate={{ scale: [0.6, 1.9], opacity: [0.7, 0] }} transition={{ duration: 2.1, repeat: Infinity, delay: k * 0.7, ease: 'easeOut' }} />
          ))}
          <MeetMark talk className="relative h-12 w-10 drop-shadow-[0_0_14px_rgba(141,182,247,0.45)]" />
          {['♪', '♫', '♪'].map((n, k) => (
            <motion.span key={k} className="absolute left-1/2 top-0 text-base text-[#a8c7fa]" animate={{ x: [0, (k - 1) * 34 + 6], y: [0, -44], opacity: [0, 1, 0], rotate: [0, (k - 1) * 18] }} transition={{ duration: 2.4, repeat: Infinity, delay: k * 0.8, ease: 'easeOut' }}>
              {n}
            </motion.span>
          ))}
        </div>
      </At>
    </>
  )
}

/** A call records (REC + ticking clock + timeline), then uploads to Igani's storage and is ready to play. */
function RecordScene(): React.ReactElement {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setSec((s) => (s + 1) % 60), 1000)
    return () => clearInterval(t)
  }, [])
  const ring = 2 * Math.PI * 15
  return (
    <>
      <At x={170} y={142}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.35 }} className="w-[240px] overflow-hidden rounded-2xl border border-white/10 bg-[#141f33] shadow-2xl shadow-black/50">
          <div className="relative flex h-[118px] items-center justify-center gap-5 bg-gradient-to-br from-[#1d2f4f] to-[#141f33]">
            <Face p={PEOPLE[0]!} size={46} />
            <Face p={PEOPLE[2]!} size={46} />
            <span className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-1 text-[10px] font-semibold tracking-wide text-white backdrop-blur">
              <motion.span className="h-2 w-2 rounded-full bg-[#ea4335]" animate={{ opacity: [1, 0.25, 1], scale: [1, 0.8, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
              REC <span className="font-mono font-normal tabular-nums text-white/80">12:{String(sec).padStart(2, '0')}</span>
            </span>
            {/* play button appears once it's saved */}
            <motion.span className="absolute inset-0 flex items-center justify-center bg-[#0b1322]/55 backdrop-blur-[2px]" animate={{ opacity: [0, 0, 1, 1, 0] }} transition={beat([0, 0.72, 0.76, 0.95, 1])}>
              <motion.span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#a8c7fa] text-[#062e6f] shadow-[0_0_30px_rgba(168,199,250,0.6)]" animate={{ scale: [0.4, 0.4, 1.1, 1, 1.06, 1] }} transition={beat([0, 0.72, 0.77, 0.8, 0.88, 0.95])}>
                <Play className="ml-0.5 h-5 w-5 fill-current" />
              </motion.span>
            </motion.span>
          </div>
          <div className="px-3 py-2.5">
            <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#ea4335] to-[#f28b82]" animate={{ width: ['0%', '100%', '100%', '0%'] }} transition={beat([0, 0.5, 0.97, 1], 'linear')} />
            </div>
            <div className="mt-1.5 flex items-end gap-[2px]">
              {Array.from({ length: 34 }, (_, k) => (
                <motion.span key={k} className="w-[4px] rounded-full bg-[#8DB6F7]/60" animate={{ height: [2, 3 + ((k * 7) % 11), 2] }} transition={{ duration: 0.9 + (k % 5) * 0.15, repeat: Infinity, delay: k * 0.03 }} />
              ))}
            </div>
          </div>
        </motion.div>
      </At>

      {/* upload to storage, then saved */}
      <At x={170} y={262}>
        <motion.div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-[#16233a] py-1.5 pl-1.5 pr-4 shadow-xl" animate={{ y: [24, 24, 0, 0, 24], opacity: [0, 0, 1, 1, 0] }} transition={beat([0, 0.48, 0.54, 0.95, 1])}>
          <span className="relative flex h-9 w-9 items-center justify-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <motion.circle cx="18" cy="18" r="15" fill="none" stroke="#81c995" strokeWidth="3" strokeLinecap="round" strokeDasharray={ring} animate={{ strokeDashoffset: [ring, ring, 0, 0, ring] }} transition={beat([0, 0.54, 0.7, 0.97, 1])} />
            </svg>
            <motion.span className="absolute" animate={{ opacity: [1, 1, 0, 0, 1], y: [0, 0, -6, -6, 0] }} transition={beat([0, 0.68, 0.71, 0.97, 1])}>
              <Cloud className="h-4 w-4 text-[#a8c7fa]" />
            </motion.span>
            <motion.span className="absolute text-[#81c995]" animate={{ scale: [0, 0, 1.3, 1, 1, 0] }} transition={beat([0, 0.7, 0.73, 0.76, 0.95, 1])}>
              <Check className="h-4 w-4" strokeWidth={3} />
            </motion.span>
          </span>
          <span className="relative text-[11px] font-medium">
            <motion.span className="block text-[#c4cbd6]" animate={{ opacity: [1, 1, 0, 0, 1] }} transition={beat([0, 0.69, 0.72, 0.97, 1])}>
              Saving to Igani…
            </motion.span>
            <motion.span className="absolute inset-0 whitespace-nowrap text-[#81c995]" animate={{ opacity: [0, 0, 1, 1, 0] }} transition={beat([0, 0.71, 0.74, 0.95, 1])}>
              Saved · ready to play
            </motion.span>
          </span>
        </motion.div>
      </At>
    </>
  )
}

/* -------------------------------------------------------------- carousel */

const swap = {
  enter: (d: number) => ({ x: d * 70, opacity: 0, scale: 0.92, filter: 'blur(10px)' }),
  center: { x: 0, opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: (d: number) => ({ x: d * -70, opacity: 0, scale: 0.92, filter: 'blur(10px)' }),
}

/** Google Meet's illustrated carousel, redone as animated scenes in Igani's colours. Swipe, click or wait. */
export function MeetCarousel({ recording }: { recording: boolean }): React.ReactElement {
  const slides = recording ? SLIDES : SLIDES.slice(0, 3)
  const n = slides.length
  const [[i, dir], setPos] = useState<[number, number]>([0, 1])
  const [paused, setPaused] = useState(false)
  const at = i % n
  const go = (d: number): void => setPos(([v]) => [(v + d + n) % n, d])
  const jump = (k: number): void => setPos(([v]) => [k, k >= v ? 1 : -1])

  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => setPos(([v]) => [(v + 1) % n, 1]), T * 1000)
    return () => clearTimeout(t)
  }, [i, paused, n])

  const s = slides[at]!
  return (
    <MotionConfig reducedMotion="user">
      <section className="hidden flex-col items-center text-center md:flex" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel">
        <div className="flex items-center gap-5">
          <button type="button" onClick={() => go(-1)} aria-label="Previous" className="rounded-full p-2 text-[#c4cbd6] transition hover:bg-white/10 active:scale-90">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <motion.div
            className="relative h-[340px] w-[340px] cursor-grab touch-pan-y overflow-hidden rounded-full bg-[#0f1a2d] ring-1 ring-white/10 active:cursor-grabbing"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (Math.abs(info.offset.x) > 60) go(info.offset.x < 0 ? 1 : -1)
            }}
          >
            {/* living backdrop: a slow aurora in Igani blues, a dot grid and a vignette */}
            <motion.div className="absolute -inset-1/3 opacity-70 blur-3xl" style={{ background: 'conic-gradient(from 0deg, #1d3a6b, #0f1a2d 25%, #2b5296 45%, #0f1a2d 70%, #1d3a6b)' }} animate={{ rotate: 360 }} transition={{ duration: 26, repeat: Infinity, ease: 'linear' }} />
            <div className="absolute inset-0 opacity-[0.18] [background-image:radial-gradient(#a8c7fa_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(circle,black_30%,transparent_72%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_35%,rgba(10,17,30,0.85)_78%)]" />
            <AnimatePresence custom={dir} mode="popLayout">
              <motion.div key={at} custom={dir} variants={swap} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} className="absolute inset-0">
                <s.Scene />
              </motion.div>
            </AnimatePresence>
          </motion.div>
          <button type="button" onClick={() => go(1)} aria-label="Next" className="rounded-full p-2 text-[#c4cbd6] transition hover:bg-white/10 active:scale-90">
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
        <div className="relative mt-8 h-[92px] w-[360px]">
          <AnimatePresence initial={false} custom={dir} mode="popLayout">
            <motion.div key={at} custom={dir} initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -12, filter: 'blur(6px)' }} transition={{ duration: 0.4, ease: 'easeOut' }} className="absolute inset-x-0" aria-live="polite">
              <h2 className="text-2xl">{s.title}</h2>
              <p className="mx-auto mt-2 max-w-[330px] text-sm text-[#9aa4b2]">{s.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-2 flex items-center gap-2">
          {slides.map((_, k) => (
            <button key={k} type="button" onClick={() => jump(k)} aria-label={`Slide ${k + 1}`} aria-current={k === at} className={cn('relative h-1.5 overflow-hidden rounded-full bg-white/20 transition-all duration-300', k === at ? 'w-7' : 'w-1.5 hover:bg-white/40')}>
              {k === at ? <motion.span key={`${i}-${paused}`} className="absolute inset-y-0 left-0 rounded-full bg-[#a8c7fa]" initial={{ width: paused ? '100%' : '0%' }} animate={{ width: '100%' }} transition={{ duration: paused ? 0 : T, ease: 'linear' }} /> : null}
            </button>
          ))}
        </div>
      </section>
    </MotionConfig>
  )
}
