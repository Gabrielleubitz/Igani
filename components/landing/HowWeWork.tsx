'use client'

import { MessageCircle, Palette, Code, Rocket } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import { Section } from './Section'

const stepIcons = [MessageCircle, Palette, Code, Rocket]

export function HowWeWork() {
  const { language } = useLanguage()
  const content = siteContent.home

  const steps = [
    { title: content.howWeWorkStep1Title[language], description: content.howWeWorkStep1Description[language] },
    { title: content.howWeWorkStep2Title[language], description: content.howWeWorkStep2Description[language] },
    { title: content.howWeWorkStep3Title[language], description: content.howWeWorkStep3Description[language] },
    { title: content.howWeWorkStep4Title[language], description: content.howWeWorkStep4Description[language] }
  ]

  return (
    <Section id="how-we-work" ariaLabel="How we work">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {content.howWeWorkTitle[language]}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {content.howWeWorkSubtitle[language]}
        </p>
        <ol className="mt-12 space-y-8 sm:space-y-10">
          {steps.map((step, index) => {
            const Icon = stepIcons[index]
            return (
              <li
                key={index}
                className="relative flex gap-6 sm:gap-8"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Step {index + 1}
                  </span>
                  <h3 className="mt-0.5 text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </Section>
  )
}
