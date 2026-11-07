'use client'

import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const SLOT = '#13213a'

/**
 * Igani Meet's loading animation: the logo builds itself (the two pills rise, the camera slides in and sends out a
 * signal), inside two slowly turning orbit rings, with the current step underneath. Used while joining, reconnecting
 * and between pages.
 */
export function MeetLoader({ steps, size = 'lg', className }: { steps: string[]; size?: 'lg' | 'sm'; className?: string }): React.ReactElement {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (steps.length < 2) return
    // walk through the steps once, then stay on the last one
    const t = setInterval(() => setI((v) => Math.min(v + 1, steps.length - 1)), 1600)
    return () => clearInterval(t)
  }, [steps.length])
  const box = size === 'lg' ? 168 : 112
  const tile = size === 'lg' ? 88 : 60
  const pill = { transformBox: 'fill-box', transformOrigin: '50% 100%' } as const

  return (
    <MotionConfig reducedMotion="user">
      <div className={cn('flex flex-col items-center', className)} role="status" aria-live="polite">
        <div className="relative flex items-center justify-center" style={{ width: box, height: box }}>
          {/* breathing glow */}
          <motion.span className="absolute inset-[12%] rounded-full bg-[#4f7fd6]/40 blur-2xl" animate={{ scale: [0.85, 1.1, 0.85], opacity: [0.5, 0.9, 0.5] }} transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }} />
          {/* two orbit rings turning opposite ways */}
          <motion.svg viewBox="0 0 100 100" className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}>
            <defs>
              <linearGradient id="meet-orbit-a" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#8DB6F7" />
                <stop offset="1" stopColor="#8DB6F7" stopOpacity="0" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="47" fill="none" stroke="url(#meet-orbit-a)" strokeWidth="1.6" strokeLinecap="round" strokeDasharray="90 205" />
            <circle cx="50" cy="3" r="2.2" fill="#a8c7fa" />
          </motion.svg>
          <motion.svg viewBox="0 0 100 100" className="absolute inset-[9%]" animate={{ rotate: -360 }} transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}>
            <circle cx="50" cy="50" r="47" fill="none" stroke="#6592E0" strokeOpacity="0.45" strokeWidth="1.2" strokeLinecap="round" strokeDasharray="4 9" />
            <circle cx="50" cy="97" r="1.8" fill="#6592E0" />
          </motion.svg>

          {/* the app tile, building the mark */}
          <motion.div
            className="relative flex items-center justify-center rounded-[26%] bg-gradient-to-b from-[#1b2d48] to-[#13213a] shadow-[0_18px_50px_-12px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
            style={{ width: tile, height: tile }}
            initial={{ scale: 0.6, opacity: 0, rotate: -8 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', bounce: 0.45, duration: 0.8 }}
          >
            <svg viewBox="420 280 1180 1360" className="h-[64%] w-[64%] overflow-visible" aria-hidden>
              <motion.g style={pill} initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1.06, 1, 0.86, 1] }} transition={{ duration: 2.4, times: [0, 0.18, 0.28, 0.6, 1], repeat: Infinity, repeatDelay: 0.2, ease: 'easeInOut', delay: 0.15 }}>
                <rect x="500" y="431" width="327" height="1166" rx="163" fill="#8DB6F7" />
                <rect x="603" y="565" width="104" height="290" rx="52" fill={SLOT} />
              </motion.g>
              <motion.g style={pill} initial={{ scaleY: 0 }} animate={{ scaleY: [0, 1.05, 1, 1.03, 0.9, 1] }} transition={{ duration: 2.4, times: [0, 0.2, 0.32, 0.5, 0.75, 1], repeat: Infinity, repeatDelay: 0.2, ease: 'easeInOut', delay: 0.3 }}>
                <rect x="900" y="335" width="325" height="1262" rx="162" fill="#6592E0" />
                <rect x="1001" y="1143" width="104" height="294" rx="52" fill={SLOT} />
              </motion.g>
              <motion.path
                d="M1290 690 L1500 572 L1500 962 L1290 844 Z"
                fill="#6592E0"
                stroke="#6592E0"
                strokeWidth="44"
                strokeLinejoin="round"
                initial={{ x: -160, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', bounce: 0.4, delay: 0.55 }}
              />
              {/* the camera sends out a signal */}
              {[0, 1].map((k) => (
                <motion.path
                  key={k}
                  d="M1560 600 Q1640 767 1560 934"
                  fill="none"
                  stroke="#a8c7fa"
                  strokeWidth="46"
                  strokeLinecap="round"
                  initial={{ opacity: 0, x: 0 }}
                  animate={{ opacity: [0, 0.9, 0], x: [0, 90, 150] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: 0.9 + k * 0.8, ease: 'easeOut' }}
                />
              ))}
            </svg>
          </motion.div>
        </div>

        <div className={cn('relative mt-6 flex w-[280px] justify-center overflow-hidden text-center', size === 'lg' ? 'h-6 text-[15px]' : 'h-5 text-sm')}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p key={i} className="absolute inset-x-0 text-[#c4cbd6]" initial={{ y: 14, opacity: 0, filter: 'blur(4px)' }} animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }} exit={{ y: -14, opacity: 0, filter: 'blur(4px)' }} transition={{ duration: 0.35, ease: 'easeOut' }}>
              {steps[i]}
            </motion.p>
          </AnimatePresence>
        </div>
        {/* indeterminate progress, in Igani blues */}
        <div className="mt-3 h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <motion.span className="block h-full w-1/2 rounded-full bg-gradient-to-r from-transparent via-[#8DB6F7] to-transparent" animate={{ x: ['-100%', '200%'] }} transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
      </div>
    </MotionConfig>
  )
}
