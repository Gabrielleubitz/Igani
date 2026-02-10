'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import { Section } from './Section'

export function FinalCTA() {
  const { language } = useLanguage()
  const content = siteContent.home

  return (
    <Section id="final-cta" ariaLabel="Get in touch">
      <div className="glass-card mx-auto max-w-3xl px-6 py-12 text-center sm:px-10 sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {content.finalCtaTitle[language]}
        </h2>
        <p className="mt-4 text-muted-foreground">
          {content.finalCtaSubtext[language]}
        </p>
        <div className="mt-8">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {content.finalCtaButton[language]}
          </Link>
        </div>
      </div>
    </Section>
  )
}
