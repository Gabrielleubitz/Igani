'use client'

import { motion } from 'framer-motion'
import { SectionHeading } from '@/app/components/landing/fx/SectionHeading'
import { WorkGallery, WorkStrip, WorkTheme } from '@/app/components/funnel-shared/WorkShowcase'
import { alsoTrustedBy, realEstateProjects } from '@/lib/workShowcase'

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

// Gabai case study. Add the result once the client confirms one (e.g. "Inquiries now come in through the website"); it stays hidden while empty.
const CASE = [
  { label: 'The problem', body: 'A dated template that made a high-end brokerage look like a budget one, to exactly the sellers it wanted.' },
  { label: 'What we built', body: 'A premium showcase: full-screen Jerusalem photography, featured properties up front, the whole team on the page, and one tap to get in touch.' },
  { label: 'The result', body: '' },
].filter((c) => c.body)

/** 03 — Our work: Gabai as a case study, then agent sites in two styles, then everything else as credibility. */
export function OurWork({ onWant }: { onWant: () => void }) {
  return (
    <section id="work" className="relative scroll-mt-20 pb-20 pt-20 sm:pt-28 lg:pb-0">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          index="03"
          label="Our work"
          aside="tap any site to look closer"
          title="Agent sites. *Live today.*"
          sub="Built for agents who were tired of a website that didn’t win them a single listing."
          className="mb-10"
        />
        <motion.div
          initial={{ y: 20 }}
          whileInView={{ y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className={`mb-12 grid gap-px overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.08] lg:mb-0 ${CASE.length > 2 ? 'md:grid-cols-[auto_1fr_1fr_1fr]' : 'md:grid-cols-[auto_1fr_1fr]'}`}
        >
          <div className="bg-[#061225] p-6 sm:p-7">
            <div className="text-[13px] text-white/55">Case study</div>
            <div className="mt-1 text-xl font-semibold text-white">Gabai Real Estate</div>
            <div className="text-sm text-white/55">Jerusalem</div>
          </div>
          {CASE.map((c) => (
            <div key={c.label} className="bg-[#061225] p-6 sm:p-7">
              <div className="font-display text-lg text-[#9ec0f5]">{c.label}</div>
              <p className="!mt-1.5 text-[15px] leading-relaxed text-white/75">{c.body}</p>
            </div>
          ))}
        </motion.div>
      </div>

      <WorkGallery theme={THEME} onWant={onWant} projects={realEstateProjects} />

      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6 lg:px-8 lg:pb-20">
        <WorkStrip
          projects={alsoTrustedBy}
          label="Also trusted by"
          labelClass="text-center text-white/55"
          listClass="justify-center"
          frameClass="border-white/15 opacity-80"
        />
      </div>
    </section>
  )
}
