'use client'

import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import { landingContent } from '@/lib/landingContent'
import { SiteSettings, Testimonial } from '@/types'
import { T } from '@/components/T'
import { SectionHeading } from './fx/SectionHeading'
import { SpotlightCard } from './fx/SpotlightCard'

type WhySectionProps = {
  settings: SiteSettings
  testimonials: Testimonial[]
}

export function WhySection({ settings, testimonials }: WhySectionProps) {
  const { language } = useLanguage()
  const home = siteContent.home

  const pillars = [
    { title: home.whyPillar1Title[language], body: home.whyPillar1Description[language] },
    { title: home.whyPillar2Title[language], body: home.whyPillar2Description[language] },
    { title: home.whyPillar3Title[language], body: home.whyPillar3Description[language] },
  ]

  return (
    <section id="about" className="relative scroll-mt-20 border-t border-white/[0.06] py-28 sm:py-36">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#4080E0]/10 blur-[160px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div>
            <SectionHeading kicker={landingContent.why.kicker[language]} title={settings.aboutTitle} />
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-lg leading-relaxed text-white/70"
            >
              <T>{settings.aboutDescription}</T>
            </motion.p>
          </div>

          <div className="grid gap-3">
            {pillars.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.08 }}
              >
                <SpotlightCard className="p-7">
                  <div className="flex items-start gap-5">
                    <span className="mt-1 font-mono text-sm text-[#80A0E0]">0{i + 1}</span>
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight text-white">{p.title}</h3>
                      <p className="!mt-2 text-[15px] leading-relaxed text-white/70">{p.body}</p>
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </div>

        {testimonials.length > 0 && (
          <div className="mt-20 grid gap-4 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.08 }}
              >
                <SpotlightCard as="figure" className="flex h-full flex-col p-7" intensity={0.18}>
                  <div className="flex items-center gap-1" aria-label={`${t.rating} out of 5 stars`}>
                    {[...Array(5)].map((_, k) => (
                      <Star
                        key={k}
                        className={`h-3.5 w-3.5 ${k < t.rating ? 'fill-[#80A0E0] text-[#80A0E0]' : 'text-white/20'}`}
                      />
                    ))}
                  </div>
                  <blockquote className="mt-4 flex-1 text-[15px] leading-relaxed text-white/75">
                    &ldquo;{t.message}&rdquo;
                  </blockquote>
                  <figcaption className="mt-6 text-sm">
                    <span className="font-semibold text-white">{t.name}</span>
                    <span className="block text-white/55">
                      {t.role}
                      {t.company ? ` · ${t.company}` : ''}
                    </span>
                  </figcaption>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
