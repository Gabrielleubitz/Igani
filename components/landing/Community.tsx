'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import { Section } from './Section'

export function Community() {
  const { language } = useLanguage()
  const content = siteContent.home

  return (
    <Section id="community" ariaLabel="Community">
      <div className="glass-card mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-16">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {content.communityTitle[language]}
        </h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          {content.communityDescription[language]}
        </p>
        <div className="mt-8">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background/80 px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {content.communityCta[language]}
          </Link>
        </div>
      </div>
    </Section>
  )
}
