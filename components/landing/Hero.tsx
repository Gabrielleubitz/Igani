'use client'

import Link from 'next/link'
import { IganiLogo } from '@/components/IganiLogo'
import { Section } from './Section'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import type { SiteSettings } from '@/types'

interface HeroProps {
  settings: SiteSettings
}

export function Hero({ settings }: HeroProps) {
  const { language } = useLanguage()
  const content = siteContent.home

  const headline = settings.heroTitle || content.heroTitle[language]
  const subheadline = settings.heroSubtitle || content.heroSubtitle[language]
  const trustLine = content.heroTrustLine[language]
  const primaryCta = content.ctaBookCall[language]
  const secondaryCta = content.ctaSeeWork[language]

  return (
    <Section id="home" ariaLabel="Hero">
      <div className="glass-card overflow-hidden">
        <div className="relative px-6 py-12 sm:px-8 sm:py-16 md:px-12 md:py-20">
          <div className="max-w-3xl">
            {/* Subtle branding */}
            <div className="mb-6 opacity-90">
              <IganiLogo className="h-8 w-auto sm:h-9" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-2">{trustLine}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-[2.75rem] leading-tight">
              {headline}
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg max-w-2xl leading-relaxed">
              {subheadline}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {primaryCta}
              </Link>
              <a
                href="#portfolio"
                className="inline-flex items-center justify-center rounded-lg border border-input bg-background/80 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {secondaryCta}
              </a>
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
