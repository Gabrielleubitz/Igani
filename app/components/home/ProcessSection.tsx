'use client'

import { motion } from 'framer-motion'
import { ClipboardList, FileSignature, MonitorPlay, Rocket, Video } from 'lucide-react'
import { ChapterBody, ChapterOpener } from '@/app/components/landing/fx/ChapterOpener'

const STEPS = [
  {
    Icon: Video,
    title: 'Intro meeting',
    body: 'A short call to understand your business, your clients and what the site has to do. No preparation needed on your side.',
    lands: 'a clear plan',
  },
  {
    Icon: MonitorPlay,
    title: 'Demo and preview',
    body: 'We build a working version of your site and walk you through it live: real pages you can click, not a static mockup.',
    lands: 'a clickable site to react to',
  },
  {
    Icon: ClipboardList,
    title: 'Structuring and closing down specs',
    body: 'We turn your feedback into a final, written scope: the pages, features, content and timeline, so nothing is left open.',
    lands: 'an agreed spec',
  },
  {
    Icon: FileSignature,
    title: 'Contract signed',
    body: 'Once the spec is agreed we sign, and the project is locked in.',
    lands: 'a signed agreement',
  },
  {
    Icon: Rocket,
    title: 'Delivery',
    body: 'We finish the build, test it, launch it and hand it over to you.',
    lands: 'your finished site, live',
  },
]

/** "The process": five steps in a numbered sequence (three across, then two). */
export function ProcessSection() {
  return (
    <section id="process" className="relative scroll-mt-20">
      <ChapterOpener
        index="04"
        label="The process"
        aside="five steps, start to finish."
        title="Call. Demo. *Done*."
        sub="No long briefs, no months of back-and-forth. You see your site working early and shape it from there."
      />
      <ChapterBody className="bg-[#081833] pb-24 pt-14 sm:pb-32 sm:pt-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <ol className="relative grid gap-4 md:grid-cols-6">
            {STEPS.map((s, i) => (
              <motion.li
                key={s.title}
                initial={{ y: 30 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className={`relative flex flex-col rounded-[28px] border border-white/[0.08] bg-[#030814]/70 p-7 backdrop-blur-xl sm:p-8 ${i < 3 ? 'md:col-span-2' : 'md:col-span-3'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-[64px] italic leading-[0.8] text-[#4080E0]">0{i + 1}</span>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4080E0]/15 text-[#9ec0f5]">
                    <s.Icon className="h-6 w-6" />
                  </span>
                </div>
                <h3 className="mt-8 text-2xl font-semibold sm:text-3xl tracking-[-0.02em] text-white">{s.title}</h3>
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
