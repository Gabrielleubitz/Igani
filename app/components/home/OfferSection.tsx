'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { Package } from '@/types'
import { ChapterBody, ChapterOpener } from '@/app/components/landing/fx/ChapterOpener'
import { SpotlightCard } from '@/app/components/landing/fx/SpotlightCard'

const SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', NIS: '₪' }

/** "What we offer / the deal": the main packages in short, each straight into /start. */
export function OfferSection({ packages, loading }: { packages: Package[]; loading: boolean }) {
  const shown = packages.slice(0, 3)
  return (
    <section id="offer" className="relative scroll-mt-20">
      <ChapterOpener
        index="05"
        label="What we offer"
        aside="prices are starting points."
        title="The *deal*."
        sub="Clear packages, a fixed scope agreed up front, and a live demo before you commit to the final build."
      />
      <ChapterBody className="bg-[#030814] pb-24 pt-14 sm:pb-32 sm:pt-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {loading && shown.length === 0
              ? [0, 1, 2].map((i) => <div key={i} className="h-[420px] animate-pulse rounded-3xl border border-white/[0.06] bg-white/[0.02]" />)
              : shown.map((pkg, i) => {
                  const featured = pkg.badge === 'recommended' || pkg.badge === 'best-seller' || pkg.badge === 'popular'
                  return (
                    <motion.div
                      key={pkg.id}
                      initial={{ y: 30 }}
                      whileInView={{ y: 0 }}
                      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                      transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <SpotlightCard className={`flex h-full flex-col p-7 sm:p-8 ${featured ? '!border-[#4080E0]/50' : ''}`}>
                        <div className="flex h-full flex-col">
                          <p className="!mt-0 text-sm text-white/55">{pkg.bestFor}</p>
                          <h3 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-white">{pkg.name}</h3>
                          <p className="font-display !mt-1 text-xl text-[#dbe6ff]">{pkg.tagline}</p>
                          <p className="!mt-5 border-t border-white/[0.08] pt-5 text-white/85">
                            {pkg.showPricing ? (
                              <>
                                <span className="text-xs text-white/50">from </span>
                                <span className="text-3xl font-semibold tracking-[-0.02em] text-white">
                                  {SYMBOLS[pkg.priceUnit] ?? '₪'}
                                  {pkg.price.toLocaleString()}
                                </span>
                              </>
                            ) : (
                              'Priced after a quick call'
                            )}
                          </p>
                          <ul className="mt-5 space-y-2">
                            {pkg.includes.slice(0, 4).map((item) => (
                              <li key={item} className="flex items-start gap-2.5 text-[15px] leading-snug text-white/75">
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4080E0]" />
                                {item}
                              </li>
                            ))}
                          </ul>
                          <div className="mt-auto pt-8">
                            <a
                              href={`/start?plan=${encodeURIComponent(pkg.name)}`}
                              className={`group inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition-colors ${
                                featured
                                  ? 'bg-white text-[#04101e] hover:bg-[#e6eefc]'
                                  : 'border border-white/20 bg-white/[0.04] text-white hover:border-white/40 hover:bg-white/[0.08]'
                              }`}
                            >
                              Get started
                              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                            </a>
                          </div>
                        </div>
                      </SpotlightCard>
                    </motion.div>
                  )
                })}
          </div>
          <a
            href="/packages"
            className="mt-8 inline-flex items-center gap-2 text-sm text-white/70 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white"
          >
            See every package, add-on and care plan
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </ChapterBody>
    </section>
  )
}
