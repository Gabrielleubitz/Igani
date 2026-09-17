'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { landingContent } from '@/lib/landingContent'
import { TeamMember } from '@/types'
import { TextReveal } from './fx/TextReveal'

type FoundersStatementProps = {
  team: TeamMember[]
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

/** One big line from the people who'll actually do the work, with their faces. */
export function FoundersStatement({ team }: FoundersStatementProps) {
  const { language } = useLanguage()
  const c = landingContent.founders
  const people = team.slice(0, 3)

  return (
    <section className="relative border-t border-white/[0.06] py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <TextReveal
          text={c.statement[language]}
          as="p"
          stagger={0.06}
          className="!mt-0 max-w-5xl text-balance text-3xl font-semibold leading-[1.08] tracking-[-0.025em] text-white sm:text-5xl lg:text-[3.6rem]"
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-6"
        >
          {people.length > 0 && (
            <div className="flex items-center">
              <div className="flex -space-x-3">
                {people.map((m, i) => (
                  <Link
                    key={m.id}
                    href="/about"
                    title={m.name}
                    className="relative block h-14 w-14 overflow-hidden rounded-full border-2 border-[#030814] bg-[#0b1a33] ring-1 ring-white/10 transition-transform duration-300 hover:z-10 hover:-translate-y-1"
                    style={{ zIndex: people.length - i }}
                  >
                    {m.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.imageUrl} alt={m.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white/80">
                        {initials(m.name)}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
              <div className="ml-5">
                <p className="font-display !mt-0 text-xl text-[#dbe6ff]">— {c.signoff[language]}</p>
                <p className="!mt-0.5 text-sm text-white/55">
                  {people.map((m) => m.name.split(' ')[0]).join(', ')}
                </p>
              </div>
            </div>
          )}

          <Link
            href="/about"
            className="group inline-flex items-center gap-2 text-sm text-white/70 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60"
          >
            {c.meet[language]}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
