'use client'

import { motion } from 'framer-motion'
import { MonitorPlay, RefreshCcw, Video } from 'lucide-react'
import { ChapterBody, ChapterOpener } from '@/app/components/landing/fx/ChapterOpener'

const STEPS = [
  {
    Icon: Video,
    title: 'Zoom meeting',
    body: 'A short call to understand your business, your clients and what the site has to do. No preparation needed on your side.',
    lands: 'a clear plan and a quote',
  },
  {
    Icon: MonitorPlay,
    title: 'Live demo',
    body: 'We build a working version of your site and walk you through it live — real pages you can click, not a static mockup.',
    lands: 'a clickable site to react to',
  },
  {
    Icon: RefreshCcw,
    title: 'Revisions',
    body: 'You tell us what to change, we refine it together until it’s right, then we launch.',
    lands: 'your finished site, live',
  },
]

/** "The process": three steps, laid out as a numbered sequence with a connecting rule. */
export function ProcessSection() {
  return (
    <section id="process" className="relative scroll-mt-20">
      <ChapterOpener
        index="04"
        label="The process"
        aside="three steps. that’s it."
        title="Call. Demo. *Done*."
        sub="No long briefs, no months of back-and-forth. You see your site working early and shape it from there."
      />
      <ChapterBody className="bg-[#081833] pb-24 pt-14 sm:pb-32 sm:pt-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <ol className="relative grid gap-4 md:grid-cols-3">
            {/* Connecting rule behind the step numbers (desktop) */}
            <div aria-hidden className="pointer-events-none absolute left-[16%] right-[16%] top-[54px] hidden h-px bg-gradient-to-r from-[#4080E0]/0 via-[#4080E0]/60 to-[#4080E0]/0 md:block" />
            {STEPS.map((s, i) => (
              <motion.li
                key={s.title}
                initial={{ y: 30 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="relative flex flex-col rounded-[28px] border border-white/[0.08] bg-[#030814]/70 p-7 backdrop-blur-xl sm:p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-[64px] italic leading-[0.8] text-[#4080E0]">0{i + 1}</span>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4080E0]/15 text-[#9ec0f5]">
                    <s.Icon className="h-6 w-6" />
                  </span>
                </div>
                <h3 className="mt-8 text-3xl font-semibold tracking-[-0.02em] text-white">{s.title}</h3>
                <p className="!mt-3 text-[15px] leading-relaxed text-white/70">{s.body}</p>
                <div className="mt-auto pt-8">
                  <div className="border-t border-white/[0.08] pt-5">
                    <p className="!mt-0 text-xs text-white/45">you walk away with</p>
                    <p className="!mt-1.5 text-[15px] text-white/90">{s.lands}</p>
                  </div>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </ChapterBody>
    </section>
  )
}
