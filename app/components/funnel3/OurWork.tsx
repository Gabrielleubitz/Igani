'use client'

import { SectionHeading } from '@/app/components/landing/fx/SectionHeading'
import { WorkGallery, WorkTheme } from '@/app/components/funnel-shared/WorkShowcase'

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

/** 03 — Our work: the sites themselves, between the data and what we build. */
export function OurWork({ onWant }: { onWant: () => void }) {
  return (
    <section id="work" className="relative scroll-mt-20 pb-20 pt-20 sm:pt-28 lg:pb-0">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          index="03"
          label="Our work"
          aside="tap any site to look closer"
          title="Real businesses. *Live today.*"
          sub="A few examples of the sites we’ve designed and built, for owners who were tired of a site that didn’t sell them."
          className="mb-12 lg:mb-0"
        />
      </div>
      <WorkGallery theme={THEME} onWant={onWant} />
    </section>
  )
}
