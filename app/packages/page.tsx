'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, ChevronDown, Mail } from 'lucide-react'
import {
  getPackages,
  getMaintenancePlans,
  getPackageSettings
} from '@/lib/firestore'
import { Package, MaintenancePlan, PackageSettings } from '@/types'
import { PageIntro, PageShell, SerifAccent } from '@/app/components/landing/fx/PageShell'
import { SpotlightCard } from '@/app/components/landing/fx/SpotlightCard'
import { MagneticButton } from '@/app/components/landing/fx/MagneticButton'

// Helper function to get currency symbol from priceUnit
function getCurrencySymbol(priceUnit: string): string {
  switch (priceUnit) {
    case 'USD':
      return '$'
    case 'EUR':
      return '€'
    case 'NIS':
      return '₪'
    default:
      return '₪'
  }
}

/** Badge label for a package, or null when it has none. */
function badgeLabel(pkg: Package): string | null {
  switch (pkg.badge) {
    case 'custom':
      return pkg.customBadgeText ? pkg.customBadgeText : null
    case 'best-seller':
      return 'Best seller'
    case 'recommended':
      return 'Recommended'
    case 'popular':
      return 'Popular'
    case 'new':
      return 'New'
    default:
      return null
  }
}

const startHref = (plan: string) => `/start?plan=${encodeURIComponent(plan)}`

const EASE = [0.22, 1, 0.36, 1] as const

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [maintenancePlans, setMaintenancePlans] = useState<MaintenancePlan[]>([])
  const [settings, setSettings] = useState<PackageSettings>({
    currencySymbol: '₪',
    showComparison: true,
    contactCtaText: 'Free Consultation',
    contactEmail: 'info@igani.co',
    calendlyUrl: ''
  })
  const [expandedAddOns, setExpandedAddOns] = useState<{ [key: string]: boolean }>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        const [packagesData, plansData, settingsData] = await Promise.all([
          getPackages(),
          getMaintenancePlans(),
          getPackageSettings()
        ])

        setPackages(packagesData.filter(p => p.published))
        setMaintenancePlans(plansData.filter(p => p.published))

        if (settingsData) {
          setSettings(settingsData)
        }
      } catch (error) {
        console.error('Error loading packages data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const toggleAddOns = (packageId: string) => {
    setExpandedAddOns(prev => ({
      ...prev,
      [packageId]: !prev[packageId]
    }))
  }


  return (
    <PageShell>
      <PageIntro
        label="Packages"
        aside="prices are starting points."
        title="Pick a *starting point*."
        sub="From a single landing page to a full web app. Every package is scoped with you before anything is built."
      />

      {/* Packages */}
      <section className="relative pb-24 sm:pb-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-[520px] animate-pulse rounded-3xl border border-white/[0.06] bg-white/[0.02]" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg, index) => {
                const badge = badgeLabel(pkg)
                const featured = pkg.badge === 'recommended' || pkg.badge === 'best-seller' || pkg.badge === 'popular'
                return (
                  <motion.div
                    key={pkg.id}
                    initial={{ y: 30 }}
                    whileInView={{ y: 0 }}
                    viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                    transition={{ duration: 0.7, delay: index * 0.08, ease: EASE }}
                  >
                    <SpotlightCard className={`flex h-full flex-col p-7 sm:p-8 ${featured ? '!border-[#4080E0]/50' : ''}`}>
                      <div className="flex h-full flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <p className="!mt-0 flex items-baseline gap-3 text-sm text-white/55">
                            <span className="font-display text-lg text-white/70">0{index + 1}</span>
                            {pkg.bestFor}
                          </p>
                          {badge && (
                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold ${
                                pkg.badge === 'custom' && pkg.customBadgeGradient
                                  ? `bg-gradient-to-r ${pkg.customBadgeGradient} text-white`
                                  : featured
                                    ? 'bg-white text-[#04101e]'
                                    : 'border border-white/15 text-white/80'
                              }`}
                            >
                              {badge}
                            </span>
                          )}
                        </div>

                        <h2 className="mt-6 border-none pb-0 text-3xl font-semibold tracking-[-0.02em] text-white">{pkg.name}</h2>
                        <p className="font-display !mt-1 text-xl text-[#dbe6ff]">{pkg.tagline}</p>

                        <div className="mt-6 border-t border-white/[0.08] pt-5">
                          {pkg.showPricing ? (
                            <>
                              <p className="!mt-0 text-xs text-white/50">Starting from</p>
                              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                                {pkg.showDiscount && pkg.originalPrice && pkg.originalPrice > pkg.price && (
                                  <span className="text-lg text-white/40 line-through">
                                    {getCurrencySymbol(pkg.priceUnit)}
                                    {pkg.originalPrice.toLocaleString()}
                                  </span>
                                )}
                                <span className="text-4xl font-semibold tracking-[-0.02em] text-white">
                                  {getCurrencySymbol(pkg.priceUnit)}
                                  {pkg.price.toLocaleString()}
                                </span>
                                {pkg.showDiscount && pkg.originalPrice && pkg.originalPrice > pkg.price && (
                                  <span className="rounded-full bg-[#4080E0]/20 px-2.5 py-0.5 text-xs font-semibold text-[#9ec0f5]">
                                    {Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)}% off
                                  </span>
                                )}
                              </div>
                            </>
                          ) : (
                            <p className="!mt-0 text-lg text-white/80">Priced after a quick call</p>
                          )}
                        </div>

                        <ul className="mt-6 space-y-2.5">
                          {pkg.includes.map((item, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-[15px] leading-snug text-white/75">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4080E0]" />
                              {item}
                            </li>
                          ))}
                        </ul>

                        {pkg.addOns.length > 0 && (
                          <div className="mt-6">
                            <button
                              type="button"
                              onClick={() => toggleAddOns(pkg.id)}
                              aria-expanded={!!expandedAddOns[pkg.id]}
                              className="flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
                            >
                              Add-ons
                              <ChevronDown className={`h-4 w-4 transition-transform ${expandedAddOns[pkg.id] ? 'rotate-180' : ''}`} />
                            </button>
                            {expandedAddOns[pkg.id] && (
                              <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 space-y-2">
                                {pkg.addOns.map((addOn, i) => (
                                  <li key={i} className="flex items-start gap-2.5 text-sm text-white/65">
                                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-white/35" />
                                    {addOn.name}
                                  </li>
                                ))}
                              </motion.ul>
                            )}
                          </div>
                        )}

                        <div className="mt-auto pt-8">
                          <p className="!mt-0 mb-4 text-sm text-white/55">
                            Delivery <span className="text-white/85">{pkg.delivery}</span>
                          </p>
                          <a
                            href={startHref(pkg.name)}
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
          )}
        </div>
      </section>

      {/* Care plans */}
      {maintenancePlans.length > 0 && (
        <section className="relative border-t border-white/[0.06] bg-[#081833] py-24 sm:py-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex items-baseline justify-between gap-6 border-t border-white/[0.12] pt-3 text-[13px] text-white/60">
              <span>After launch</span>
              <span className="hidden sm:block">priced on a quick call.</span>
            </div>
            <h2 className="mb-12 max-w-3xl border-none pb-0 text-balance text-4xl font-semibold leading-[1.0] tracking-[-0.025em] text-white sm:text-5xl lg:text-6xl">
              <SerifAccent text="Keep it *fast*, safe and current." />
            </h2>

            <div className="grid gap-4 md:grid-cols-3">
              {maintenancePlans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ y: 30 }}
                  whileInView={{ y: 0 }}
                  viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                  transition={{ duration: 0.7, delay: index * 0.08, ease: EASE }}
                >
                  <SpotlightCard className="flex h-full flex-col p-7">
                    <div className="flex h-full flex-col">
                      <h3 className="text-2xl font-semibold tracking-[-0.02em] text-white">{plan.name}</h3>
                      <ul className="mt-6 space-y-2.5">
                        {plan.includes.map((item, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-[15px] leading-snug text-white/75">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4080E0]" />
                            {item}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-auto pt-8">
                        <a
                          href={startHref(plan.name)}
                          className="group inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.04] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/[0.08]"
                        >
                          Choose plan
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </a>
                      </div>
                    </div>
                  </SpotlightCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Closing call to action — the same blue the home page ends on */}
      <section className="relative overflow-hidden bg-[radial-gradient(120%_80%_at_50%_0%,#1d4fa3_0%,#0c2552_50%,#0a1f47_100%)] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mx-auto max-w-4xl border-none pb-0 text-balance text-[clamp(40px,6vw,88px)] font-semibold leading-[0.98] tracking-[-0.035em] text-white">
            <SerifAccent text="Not sure which one? Let’s *talk*." />
          </h2>
          <p className="mx-auto !mt-6 max-w-xl text-lg leading-relaxed text-white/75">
            Tell us what you&rsquo;re building and we&rsquo;ll point you to the right starting point.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <MagneticButton href="/start">
              Start a project
              <ArrowRight className="h-4 w-4" />
            </MagneticButton>
            <MagneticButton variant="ghost" href={`mailto:${settings.contactEmail}?subject=Project%20inquiry`}>
              <Mail className="h-4 w-4" />
              Email us
            </MagneticButton>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
