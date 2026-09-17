'use client'

import { ReactNode, useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Compass, PenTool, Hammer, ShieldCheck, Rocket } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import { landingContent } from '@/lib/landingContent'
import { SectionHeading } from './fx/SectionHeading'

const ICONS = [Compass, PenTool, Hammer, ShieldCheck, Rocket]

type Step = {
  title: string
  body: string
  deliverable: string
  Icon: typeof Compass
}

function StepCard({ step, index, delay }: { step: Step; index: number; delay: number }) {
  const { language } = useLanguage()
  const c = landingContent.process
  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay }}
      className="group relative flex w-full shrink-0 flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#061225]/80 p-7 backdrop-blur-xl lg:w-[420px] lg:min-h-[440px]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-10 select-none font-semibold leading-none text-white/[0.04] transition-colors duration-500 group-hover:text-[#4080E0]/[0.12]"
        style={{ fontSize: 'clamp(9rem, 16vw, 14rem)' }}
      >
        0{index + 1}
      </span>
      <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[#4080E0]/30 bg-[#4080E0]/10 text-[#9ec0f5]">
        <step.Icon className="h-5 w-5" strokeWidth={1.6} />
      </div>
      <p className="relative mt-8 font-mono text-[11px] uppercase tracking-[0.25em] text-white/40">Step 0{index + 1}</p>
      <h3 className="relative mt-2 text-3xl font-semibold tracking-[-0.02em] text-white">{step.title}</h3>
      <p className="relative mt-4 text-[15px] leading-relaxed text-white/70">{step.body}</p>
      <div className="relative mt-auto pt-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">{c.deliverable[language]}</p>
        <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white/85">
          <span className="h-1.5 w-1.5 rounded-full bg-[#80A0E0]" />
          {step.deliverable}
        </p>
      </div>
    </motion.li>
  )
}

/** Desktop: sticky stage, scroll progress drives horizontal translate. */
function DesktopTrack({ heading, steps, rtl }: { heading: ReactNode; steps: Step[]; rtl: boolean }) {
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

  return (
    <div ref={trackRef} className="relative" style={{ height: '260vh' }}>
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
        <div className="mx-auto mt-10 w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="h-px w-full bg-white/[0.08]">
            <motion.div
              className="h-full origin-left bg-gradient-to-r from-[#4080E0] to-[#80A0E0]"
              style={{ scaleX: progressScale }}
            />
          </div>
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
  ].map((s, i) => ({ ...s, deliverable: c.deliverables[i][language], Icon: ICONS[i] }))

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

  const heading = <SectionHeading kicker={c.kicker[language]} title={c.title[language]} sub={c.sub[language]} />

  return (
    <section id="process" className="relative scroll-mt-20 border-t border-white/[0.06]">
      {mounted && isDesktop ? (
        <DesktopTrack heading={heading} steps={steps} rtl={language === 'he'} />
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
