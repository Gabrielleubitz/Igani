'use client'

import { Globe, Smartphone, Cloud } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import { Section } from './Section'

const icons = { Globe, Smartphone, Cloud }

export function Services() {
  const { language } = useLanguage()
  const content = siteContent.home

  const items = [
    {
      key: 'websites',
      title: content.serviceWebsitesTitle[language],
      description: content.serviceWebsitesDescription[language],
      icon: 'Globe' as const
    },
    {
      key: 'apps',
      title: content.serviceAppsTitle[language],
      description: content.serviceAppsDescription[language],
      icon: 'Smartphone' as const
    },
    {
      key: 'saas',
      title: content.serviceSaaSTitle[language],
      description: content.serviceSaaSDescription[language],
      icon: 'Cloud' as const
    }
  ]

  return (
    <Section id="services" ariaLabel="Services">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {content.servicesTitle[language]}
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          {content.servicesSubtitle[language]}
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = icons[item.icon]
            return (
              <div
                key={item.key}
                className="glass-card p-6 transition-transform hover:scale-[1.01]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </Section>
  )
}
