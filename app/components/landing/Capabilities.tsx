'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { landingContent } from '@/lib/landingContent'
import { SectionHeading } from './fx/SectionHeading'
import { LiveBuildDemo } from './demos/LiveBuildDemo'
import { DesignLabDemo } from './demos/DesignLabDemo'
import { AutomationFlowDemo } from './demos/AutomationFlowDemo'

type PanelProps = {
  index: number
  label: string
  title: string
  body: string
  chips?: string[]
  children: ReactNode
}

function Panel({ index, label, title, body, chips, children }: PanelProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-120px' }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="lg:sticky rounded-[28px] border border-white/[0.08] bg-[#061225]/85 p-4 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:p-6 lg:p-8"
      style={{ top: `calc(5.5rem + ${index * 14}px)` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.6fr] lg:gap-12">
        <div className="flex flex-col">
          <p className="inline-flex w-fit items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[#9ec0f5]">
            <span className="text-white/30">0{index + 1}</span>
            {label}
          </p>
          <h3 className="mt-4 text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-white sm:text-4xl">
            {title}
          </h3>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70 sm:text-base">{body}</p>
          {chips && (
            <div className="mt-6 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[11px] text-white/70"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </motion.article>
  )
}

export function Capabilities() {
  const { language } = useLanguage()
  const c = landingContent.capabilities

  return (
    <section id="capabilities" className="relative scroll-mt-20 py-28 sm:py-36">
      {/* Aurora blobs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-40 h-[520px] w-[520px] rounded-full bg-[#4080E0]/15 blur-[140px]" />
        <div className="absolute -right-40 bottom-40 h-[520px] w-[520px] rounded-full bg-[#1b3f8a]/25 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading kicker={c.kicker[language]} title={c.title[language]} sub={c.sub[language]} className="mb-16" />

        <div className="flex flex-col gap-6">
          <Panel
            index={0}
            label={c.build.label[language]}
            title={c.build.title[language]}
            body={c.build.body[language]}
            chips={c.build.chips.map((x) => x[language])}
          >
            <LiveBuildDemo />
          </Panel>

          <Panel
            index={1}
            label={c.design.label[language]}
            title={c.design.title[language]}
            body={c.design.body[language]}
          >
            <DesignLabDemo />
          </Panel>

          <Panel
            index={2}
            label={c.automation.label[language]}
            title={c.automation.title[language]}
            body={c.automation.body[language]}
          >
            <AutomationFlowDemo />
          </Panel>
        </div>
      </div>
    </section>
  )
}
