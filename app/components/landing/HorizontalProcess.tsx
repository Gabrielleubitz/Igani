'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import { landingContent } from '@/lib/landingContent'
import { SideNote } from './fx/SideNote'
import { ChapterBody, ChapterOpener } from './fx/ChapterOpener'

type Step = {
  title: string
  body: string
  deliverable: string
}

/* Slightly uneven widths on purpose — a perfectly uniform row reads as a template. */
const WIDTHS = ['lg:w-[400px]', 'lg:w-[460px]', 'lg:w-[420px]', 'lg:w-[380px]', 'lg:w-[440px]']

/**
 * Light chapter: on desktop each step is a white card in the horizontal track;
 * on phones the steps are plain rows split by hairlines.
 */
function StepCard({ step, index, delay, variant }: { step: Step; index: number; delay: number; variant: 'card' | 'row' }) {
  const { language } = useLanguage()
  const c = landingContent.process
  const card = variant === 'card'
  return (
    <motion.li
      initial={{ y: 24 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay }}
      className={
        card
          ? `group relative flex w-full shrink-0 flex-col overflow-hidden rounded-[28px] bg-white p-8 shadow-[0_1px_0_rgba(3,8,20,0.06),0_24px_48px_-28px_rgba(3,8,20,0.28)] lg:min-h-[400px] ${WIDTHS[index] ?? ''}`
          : 'relative flex flex-col border-b border-[#030814]/10 py-10 last:border-b-0'
      }
    >
      <div className="flex items-baseline gap-3">
        <span className="font-display text-[96px] italic leading-[0.8] text-[#2A5FB8]">0{index + 1}</span>
        <span className="text-sm text-[#3A4660]">/ 05</span>
      </div>
      <h3 className="mt-6 text-3xl font-semibold tracking-[-0.02em] text-[#030814]">{step.title}</h3>
      <p className="!mt-3 text-[15px] leading-relaxed text-[#3A4660]">{step.body}</p>
      <div className={`border-t border-[#030814]/10 pt-5 ${card ? 'mt-auto' : 'mt-6'}`}>
        <p className="!mt-0 text-xs text-[#3A4660]/80">{c.deliverable[language]}</p>
        <p className="!mt-1.5 text-[15px] font-medium text-[#030814]">{step.deliverable}</p>
      </div>
    </motion.li>
  )
}

/** Desktop: sticky stage, scroll progress drives horizontal translate. */
function DesktopTrack({ tag, steps, rtl, hint }: { tag: ReactNode; steps: Step[]; rtl: boolean; hint: string }) {
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
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">{tag}</div>
        <div className="mt-12 w-full overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.ul ref={railRef} style={{ x }} className="flex w-max gap-5 pr-[20vw]">
              {steps.map((s, i) => (
                <StepCard key={s.title} step={s} index={i} delay={0} variant="card" />
              ))}
            </motion.ul>
          </div>
        </div>
        <div className="mx-auto mt-10 flex w-full max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <div className="h-px flex-1 bg-[#030814]/10">
            <motion.div
              className="h-full origin-left bg-gradient-to-r from-[#4080E0] to-[#80A0E0]"
              style={{ scaleX: progressScale }}
            />
          </div>
          <motion.div style={{ opacity: hintOpacity }}>
            <SideNote arrow="down" className="!text-[#2A5FB8] [&_svg]:!text-[#2A5FB8]">
              {hint}
            </SideNote>
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
  ].map((s, i) => ({ ...s, deliverable: c.deliverables[i][language] }))

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

  const tag = (
    <p className="!mt-0 flex items-baseline gap-3 text-[13px] text-[#3A4660]">
      <span className="font-display text-lg leading-none text-[#030814]/80">{c.index}</span>
      {c.label[language]}
    </p>
  )

  return (
    <section id="process" className="relative scroll-mt-20 text-[#030814]">
      <ChapterOpener
        tone="light"
        index={c.index}
        label={c.label[language]}
        aside={c.aside[language]}
        title={c.title[language]}
        sub={c.sub[language]}
      />
      <ChapterBody className="bg-[#EEF1F6] shadow-[0_-1px_0_rgba(3,8,20,0.08),0_-30px_60px_-30px_rgba(3,8,20,0.18)]">
        {mounted && isDesktop ? (
          <DesktopTrack tag={tag} steps={steps} rtl={language === 'he'} hint={c.hint[language]} />
        ) : (
          <ul className="mx-auto flex max-w-6xl flex-col px-4 py-12 sm:px-6">
            {steps.map((s, i) => (
              <StepCard key={s.title} step={s} index={i} delay={i * 0.05} variant="row" />
            ))}
          </ul>
        )}
      </ChapterBody>
    </section>
  )
}
