'use client'

import { motion } from 'framer-motion'
import { Check, Clock, MessageCircle, Sparkles } from 'lucide-react'

const bulletIcons = [Sparkles, Clock, MessageCircle] as const

type ContactInquirySuccessProps = {
  badge: string
  heading: string
  lead: string
  bullets: [string, string, string]
  className?: string
}

export function ContactInquirySuccess({
  badge,
  heading,
  lead,
  bullets,
  className = '',
}: ContactInquirySuccessProps) {
  const particles = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    left: `${8 + (i * 9) % 84}%`,
    top: `${12 + (i * 17) % 70}%`,
    delay: i * 0.12,
    duration: 3 + (i % 3),
  }))

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-2xl border border-cyan-500/35 bg-gradient-to-br from-slate-900/95 via-slate-950/90 to-cyan-950/40 shadow-[0_0_40px_-8px_rgba(34,211,238,0.2)] ${className}`}
    >
      <motion.div
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/25 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl"
        animate={{ scale: [1.1, 1, 1.1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent skew-x-12"
        animate={{ translateX: ['-100%', '200%'] }}
        transition={{ duration: 2.2, ease: 'easeInOut', delay: 0.1 }}
      />

      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-cyan-300/60"
          style={{ left: p.left, top: p.top }}
          animate={{ y: [0, -6, 0], opacity: [0.35, 0.75, 0.35] }}
          transition={{
            delay: p.delay,
            duration: p.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      <div className="relative z-10 p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <div className="relative mx-auto flex-shrink-0 sm:mx-0">
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 18, delay: 0.05 }}
              className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/35 ring-2 ring-white/20"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.32, type: 'spring', stiffness: 500, damping: 22 }}
              >
                <Check className="h-7 w-7 text-slate-950" strokeWidth={3} aria-hidden />
              </motion.div>
            </motion.div>
            <motion.div
              className="absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-br from-cyan-400/40 to-emerald-500/30 blur-md"
              animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.05, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.35 }}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-300/95"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {badge}
            </motion.p>

            <motion.h3
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mt-3 text-xl font-bold leading-tight text-white sm:text-2xl"
            >
              {heading}
            </motion.h3>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.4 }}
              className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base"
            >
              {lead}
            </motion.p>

            <ul className="mt-5 space-y-3">
              {bullets.map((text, i) => {
                const Icon = bulletIcons[i]
                return (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.38 + i * 0.1, duration: 0.4 }}
                    className="flex gap-3 text-left text-sm text-slate-200 sm:text-[0.9375rem]"
                  >
                    <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-600/60 bg-slate-800/80 text-cyan-400">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="leading-snug">{text}</span>
                  </motion.li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
