'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { WhatsAppGlyph } from '@/components/SocialGlyphs'
import { MagneticButton } from '@/app/components/landing/fx/MagneticButton'
import { FocusIn } from '@/app/components/funnel-shared/FocusIn'
import { WHATSAPP_HREF } from './contact'

const EASE = [0.22, 1, 0.36, 1] as const

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: EASE, delay },
})

/** Brand-blue opener: an agent's website is their first listing presentation. */
export function Hero({ onCta }: { onCta: () => void }) {
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden" aria-label="IGANI for real estate">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-white/15 blur-[140px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-4 pb-24 pt-32 text-center sm:px-6 lg:px-8">
        <motion.p {...fadeUp(0)} className="mb-8 text-sm text-white/75">
          IGANI · Websites for real estate agents &amp; brokerages
        </motion.p>

        <FocusIn>
          <h1 className="text-balance text-[clamp(2.6rem,8vw,6.5rem)] font-semibold leading-[0.96] tracking-[-0.035em] text-white">
            Buyers Google you{' '}
            <span className="font-display pr-[0.04em] text-[1.08em] font-normal text-[#e9f0ff]">before</span> they call you
            <span className="text-[#04101e]">.</span>
          </h1>
        </FocusIn>

        <motion.p {...fadeUp(1.0)} className="!mt-6 text-xl font-medium text-white sm:text-2xl">
          Make sure what they find wins the listing.
        </motion.p>
        <motion.p {...fadeUp(1.15)} className="!mt-4 max-w-xl text-lg leading-relaxed text-white/85">
          If your site looks like 2018, sellers assume your marketing is too, and they call the agent whose site looks like a luxury brand.
        </motion.p>

        <motion.div {...fadeUp(1.3)} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <MagneticButton onClick={onCta}>
            Call me back
            <ArrowRight className="h-4 w-4" />
          </MagneticButton>
          <MagneticButton variant="ghost" href={WHATSAPP_HREF} external>
            <WhatsAppGlyph className="h-4 w-4" />
            Talk to us on WhatsApp
          </MagneticButton>
        </motion.div>
      </div>
    </section>
  )
}
