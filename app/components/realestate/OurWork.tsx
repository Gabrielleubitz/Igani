'use client'

import { SectionHeading } from '@/app/components/landing/fx/SectionHeading'
import { WorkGallery, WorkTheme } from '@/app/components/funnel-shared/WorkShowcase'
import { realEstateProjects } from '@/lib/workShowcase'
import { LogoTicker } from './LogoTicker'

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
  badge: 'border-[#9ec0f5]/40 text-[#9ec0f5]',
  hideNames: true,
}

/** 03 — Site concepts we've tailored for agents, then a sliding ticker of everyone we've built for. */
export function OurWork({ onWant }: { onWant: () => void }) {
  return (
    <section id="work" className="relative scroll-mt-20 pb-24 pt-20 sm:pt-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          index="03"
          label="Site concepts"
          aside="scroll to browse them"
          title="Site concepts we’ve *tailored for agents*."
          sub="Built for agents who were tired of a website that didn’t win them a single listing."
          className="mb-10 lg:mb-0"
        />
      </div>

      <WorkGallery theme={THEME} onWant={onWant} projects={realEstateProjects} />

      <LogoTicker className="mt-10 sm:mt-14 lg:mt-6" />
    </section>
  )
}
