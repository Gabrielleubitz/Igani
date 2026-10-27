'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Star } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import { landingContent } from '@/lib/landingContent'
import { SiteSettings, Testimonial } from '@/types'
import { T } from '@/components/T'
import { ChapterBody, ChapterOpener } from './fx/ChapterOpener'

type WhySectionProps = {
  settings: SiteSettings
  testimonials: Testimonial[]
  /** Reserve the testimonial block's space until data arrives, so the page doesn't jump */
  testimonialsLoading?: boolean
}

/** One testimonial at a time, set large in the serif, with a small switcher. */
function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const [i, setI] = useState(0)
  const t = testimonials[i % testimonials.length]
  const go = (d: number) => setI((n) => (n + d + testimonials.length) % testimonials.length)

  return (
    <div className="mt-24 border-t border-white/[0.1] pt-14 sm:mt-32">
      <AnimatePresence mode="wait">
        <motion.figure
          key={t.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-4xl"
        >
          <div className="flex items-center gap-1" aria-label={`${t.rating} out of 5 stars`}>
            {[...Array(5)].map((_, k) => (
              <Star key={k} className={`h-4 w-4 ${k < t.rating ? 'fill-[#80A0E0] text-[#80A0E0]' : 'text-white/20'}`} />
            ))}
          </div>
          <blockquote className="font-display mt-6 text-[clamp(26px,3.2vw,40px)] italic leading-[1.2] text-[#e9f0ff]">
            &ldquo;{t.message}&rdquo;
          </blockquote>
          <figcaption className="mt-8 text-sm">
            <span className="font-semibold text-white">{t.name}</span>
            <span className="text-white/55">
              {' · '}
              {t.role}
              {t.company ? `, ${t.company}` : ''}
            </span>
          </figcaption>
        </motion.figure>
      </AnimatePresence>

      {testimonials.length > 1 && (
        <div className="mt-10 flex items-center gap-4">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous testimonial"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/75 transition-colors hover:border-white/40 hover:text-white rtl:rotate-180"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next testimonial"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/75 transition-colors hover:border-white/40 hover:text-white rtl:rotate-180"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <div className="flex gap-1.5">
            {testimonials.map((x, k) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setI(k)}
                aria-label={`Testimonial ${k + 1}`}
                aria-current={k === i}
                className={`h-1.5 rounded-full transition-all ${k === i ? 'w-6 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/60'}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function WhySection({ settings, testimonials, testimonialsLoading = false }: WhySectionProps) {
  const { language } = useLanguage()
  const home = siteContent.home

  const pillars = [
    { title: home.whyPillar1Title[language], body: home.whyPillar1Description[language] },
    { title: home.whyPillar2Title[language], body: home.whyPillar2Description[language] },
    { title: home.whyPillar3Title[language], body: home.whyPillar3Description[language] },
  ]

  return (
    <section id="about" className="relative scroll-mt-20">
      <ChapterOpener
        index={landingContent.why.index}
        label={landingContent.why.label[language]}
        aside={landingContent.why.aside[language]}
        title={settings.aboutTitle}
      />

      <ChapterBody className="bg-[#030814] pb-24 pt-16 sm:pb-32 sm:pt-24">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-[32px]">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#4080E0]/10 blur-[160px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
            {/* Left column stays put while the list scrolls past */}
            <div className="lg:sticky lg:top-32 lg:self-start">
              <p className="!mt-0 text-xl leading-relaxed text-white/80 sm:text-2xl">
                <T>{settings.aboutDescription}</T>
              </p>
            </div>

            <ol>
              {pillars.map((p, i) => (
                <motion.li
                  key={p.title}
                  initial={{ y: 20 }}
                  whileInView={{ y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.55, delay: i * 0.08 }}
                  className="flex items-start gap-6 border-t border-white/[0.12] py-9 last:border-b"
                >
                  <span className="font-display mt-1 text-4xl italic leading-none text-[#4080E0]">0{i + 1}</span>
                  <div>
                    <h3 className="text-2xl font-semibold tracking-tight text-white">{p.title}</h3>
                    <p className="!mt-2 text-base leading-relaxed text-white/70">{p.body}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>

          {testimonialsLoading && <div aria-hidden className="mt-24 h-[470px] sm:mt-32" />}
          {testimonials.length > 0 && <Testimonials testimonials={testimonials} />}
        </div>
      </ChapterBody>
    </section>
  )
}
