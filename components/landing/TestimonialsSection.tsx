'use client'

import { Star } from 'lucide-react'
import Image from 'next/image'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import type { Testimonial } from '@/types'
import { Section } from './Section'

interface TestimonialsSectionProps {
  testimonials: Testimonial[]
}

export function TestimonialsSection({ testimonials }: TestimonialsSectionProps) {
  const { language } = useLanguage()
  const content = siteContent.home

  const featured = testimonials.filter((t) => t.featured).slice(0, 6)
  if (featured.length === 0) return null

  return (
    <Section id="testimonials" ariaLabel="Testimonials">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {content.testimonialsTitle[language]}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((t) => (
            <blockquote
              key={t.id}
              className="glass-card p-6"
            >
              <div className="flex gap-1 mb-4" aria-hidden>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i <= t.rating ? 'text-amber-500 fill-amber-500' : 'text-muted'
                    }`}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                &ldquo;{t.message}&rdquo;
              </p>
              <footer className="mt-4 flex items-center gap-3">
                {t.image ? (
                  <Image
                    src={t.image}
                    alt=""
                    width={40}
                    height={40}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                    {t.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <cite className="not-italic text-sm font-semibold text-foreground">
                    {t.name}
                  </cite>
                  <p className="text-xs text-muted-foreground">
                    {t.role} at {t.company}
                  </p>
                </div>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </Section>
  )
}
