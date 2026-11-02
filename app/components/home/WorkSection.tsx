'use client'

import { SectionHeading } from '@/app/components/landing/fx/SectionHeading'
import { WorkGallery, WorkTheme } from '@/app/components/funnel-shared/WorkShowcase'
import { LogoTicker } from '@/app/components/realestate/LogoTicker'

// Same look as the gallery on /realestate (pinned phone-and-browser stage, then a ticker of everyone we've built for).
const THEME: WorkTheme = {
  frame: 'border-white/[0.12] bg-[#0a1830]',
  chrome: 'bg-[#0a1830]',
  chromeText: 'text-white/50',
  title: 'text-white',
  meta: 'text-white/55',
  body: 'text-white/70',
  button: 'rounded-full bg-white text-[#04101e] hover:bg-[#e6eefc]',
  link: 'text-[#9ec0f5] hover:text-white',
  counter: 'font-display text-[15px] text-white/80',
  dot: 'bg-white/25',
  dotActive: 'bg-[#4080E0]',
  overlay: 'bg-[#030814]/90',
  panel: 'border-white/10 bg-[#030814]',
}

/** 01 — Our work: the sites themselves in the pinned gallery, then a sliding ticker of the businesses we've built for. */
export function WorkSection({ onWant }: { onWant: () => void }) {
  return (
    <section id="work" className="relative scroll-mt-20 pb-24 pt-20 sm:pt-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          index="01"
          label="Our work"
          aside="scroll to browse them"
          title="Real businesses. *Live today.*"
          sub="A few examples of the sites we’ve designed and built, for owners who were tired of a site that didn’t sell them."
          className="mb-10 lg:mb-0"
        />
      </div>

      {/* The header's "Portfolio" link lands here */}
      <div id="portfolio" className="scroll-mt-28">
        <WorkGallery theme={THEME} onWant={onWant} />
      </div>

      <LogoTicker className="mt-10 sm:mt-14 lg:mt-6" />
    </section>
  )
}
