'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import { landingContent } from '@/lib/landingContent'
import { SectionHeading } from './fx/SectionHeading'
import { SideNote } from './fx/SideNote'
import { STEP_SKETCHES } from './StepArtifacts'

type Step = {
  title: string
  body: string
  deliverable: string
  Sketch: (typeof STEP_SKETCHES)[number]
}

/* Slightly uneven widths on purpose — a perfectly uniform row reads as a template. */
const WIDTHS = ['lg:w-[400px]', 'lg:w-[460px]', 'lg:w-[420px]', 'lg:w-[380px]', 'lg:w-[440px]']

function StepCard({ step, index, delay }: { step: Step; index: number; delay: number }) {
  const { language } = useLanguage()
  const c = landingContent.process
  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay }}
      className={`group relative flex w-full shrink-0 flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#061225]/80 p-7 backdrop-blur-xl lg:min-h-[380px] ${WIDTHS[index] ?? ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="!mt-0 flex items-baseline gap-2 text-sm text-white/50">
          <span className="font-display text-2xl text-white/85">0{index + 1}</span>
          <span>/ 05</span>
        </p>
        <step.Sketch className="h-16 w-24 text-[#9ec0f5] transition-colors duration-500 group-hover:text-white" />
      </div>
      <h3 className="mt-6 text-3xl font-semibold tracking-[-0.02em] text-white">{step.title}</h3>
      <p className="!mt-3 text-[15px] leading-relaxed text-white/70">{step.body}</p>
      <div className="mt-auto border-t border-white/[0.08] pt-5">
        <p className="!mt-0 text-xs text-white/45">{c.deliverable[language]}</p>
        <p className="!mt-1.5 text-[15px] text-white/90">{step.deliverable}</p>
      </div>
    </motion.li>
  )
}

/** Desktop: sticky stage, scroll progress drives horizontal translate. */
function DesktopTrack({ heading, steps, rtl, hint }: { heading: ReactNode; steps: Step[]; rtl: boolean; hint: string }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLUListElement>(null)
  const [shift, setShift] = useState(0)

  useEffect(() => {
    const measure = () => {
      const rail = railRef.current
      const clip = rail?.parentElement
      if (!rail || !clip) return
      setShift(Math.max(0, rail.scrollWidth - clip.clientWidth))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (railRef.current) ro.observe(railRef.current)
    if (railRef.current?.parentElement) ro.observe(railRef.current.parentElement)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [steps])

  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, [0.05, 0.95], [0, rtl ? shift : -shift])
  const progressScale = useTransform(scrollYProgress, [0.05, 0.95], [0, 1])
  const hintOpacity = useTransform(scrollYProgress, [0, 0.12, 0.2], [1, 1, 0])

  return (
    <div ref={trackRef} className="relative" style={{ height: '200vh' }}>
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">{heading}</div>
        <div className="mt-12 w-full overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.ul ref={railRef} style={{ x }} className="flex w-max gap-5 pr-[20vw]">
              {steps.map((s, i) => (
                <StepCard key={s.title} step={s} index={i} delay={0} />
              ))}
            </motion.ul>
          </div>
        </div>
        <div className="mx-auto mt-10 flex w-full max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <div className="h-px flex-1 bg-white/[0.08]">
            <motion.div
              className="h-full origin-left bg-gradient-to-r from-[#4080E0] to-[#80A0E0]"
              style={{ scaleX: progressScale }}
            />
          </div>
          <motion.div style={{ opacity: hintOpacity }}>
            <SideNote arrow="down">{hint}</SideNote>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export function HorizontalProcess() {
  const { language } = useLanguage()
  const home = siteContent.home
  const c = landingContent.process

  const steps: Step[] = [
    { title: home.step1Title[language], body: home.step1Description[language] },
    { title: home.step2Title[language], body: home.step2Description[language] },
    { title: home.step3Title[language], body: home.step3Description[language] },
    { title: home.step4Title[language], body: home.step4Description[language] },
    { title: home.step5Title[language], body: home.step5Description[language] },
  ].map((s, i) => ({ ...s, deliverable: c.deliverables[i][language], Sketch: STEP_SKETCHES[i] }))

  const [isDesktop, setIsDesktop] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const update = () => setIsDesktop(mq.matches)
    update()
    setMounted(true)
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const heading = (
    <SectionHeading
      index={c.index}
      label={c.label[language]}
      aside={c.aside[language]}
      title={c.title[language]}
      sub={c.sub[language]}
    />
  )

  return (
    <section id="process" className="relative scroll-mt-20 border-t border-white/[0.06]">
      {mounted && isDesktop ? (
        <DesktopTrack heading={heading} steps={steps} rtl={language === 'he'} hint={c.hint[language]} />
      ) : (
        <div className="mx-auto max-w-6xl px-4 py-28 sm:px-6">
          <div className="mb-12">{heading}</div>
          <ul className="flex flex-col gap-4">
            {steps.map((s, i) => (
              <StepCard key={s.title} step={s} index={i} delay={i * 0.05} />
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
