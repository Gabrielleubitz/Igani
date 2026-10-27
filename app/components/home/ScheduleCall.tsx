'use client'

import { motion } from 'framer-motion'
import { ArrowRight, CalendarDays } from 'lucide-react'
import { WhatsAppGlyph } from '@/components/SocialGlyphs'
import { MagneticButton } from '@/app/components/landing/fx/MagneticButton'

/** Closing chapter: one big invitation to book the first call. */
export function ScheduleCall() {
  return (
    <section id="schedule" className="relative scroll-mt-20 overflow-hidden">
      <div className="mx-auto flex min-h-[80svh] max-w-6xl flex-col items-center justify-center px-4 py-28 text-center sm:px-6 lg:px-8">
        <div className="mb-10 flex items-baseline gap-3 text-[13px] text-white/70">
          <span className="font-display text-lg leading-none text-white">06</span>
          Schedule a call
        </div>
        <motion.h2
          initial={{ y: 30 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true, margin: '0px 0px -10% 0px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl border-none pb-0 text-balance text-[clamp(44px,7vw,112px)] font-semibold leading-[0.96] tracking-[-0.04em] text-white"
        >
          Let&rsquo;s get your site <span className="font-display pr-[0.04em] text-[1.08em] font-normal text-[#e9f0ff]">working</span> for you
          <span className="text-[#04101e]">.</span>
        </motion.h2>
        <p className="mx-auto !mt-8 max-w-xl text-lg leading-relaxed text-white/80">
          A short Zoom call to understand your business. If we&rsquo;re a fit, you&rsquo;ll see a live demo of your site soon after.
        </p>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <MagneticButton href="/start">
            <CalendarDays className="h-4 w-4" />
            Schedule a call
            <ArrowRight className="h-4 w-4" />
          </MagneticButton>
          <MagneticButton
            variant="ghost"
            href={`https://wa.me/972584477757?text=${encodeURIComponent("Hi IGANI, I'd like to schedule a call.")}`}
          >
            <WhatsAppGlyph className="h-4 w-4" />
            WhatsApp us
          </MagneticButton>
        </div>
      </div>
    </section>
  )
}
