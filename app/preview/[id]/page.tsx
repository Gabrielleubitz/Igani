'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ArrowUpRight, Monitor, Smartphone, Tablet } from 'lucide-react'
import { getWebsites } from '@/lib/firestore'
import { Website } from '@/types'
import { SitePreviewFrame } from '@/app/components/SitePreviewFrame'
import { normalizeWebsiteUrl } from '@/lib/websiteUrl'
import { PageShell, SerifAccent } from '@/app/components/landing/fx/PageShell'
import { MagneticButton } from '@/app/components/landing/fx/MagneticButton'

const EASE = [0.22, 1, 0.36, 1] as const

const VIEWS = [
  { id: 'desktop', label: 'Desktop', Icon: Monitor },
  { id: 'tablet', label: 'Tablet', Icon: Tablet },
  { id: 'mobile', label: 'Mobile', Icon: Smartphone },
] as const

type ViewMode = (typeof VIEWS)[number]['id']

export default function PreviewPage({ params }: { params: { id: string } }) {
  const [website, setWebsite] = useState<Website | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('desktop')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getWebsites()
      .then((websites) => setWebsite(websites.find((w) => w.id === params.id) ?? null))
      .catch((error) => console.error('Error loading website:', error))
      .finally(() => setIsLoading(false))
  }, [params.id])

  const liveUrl = (() => {
    if (!website) return ''
    try {
      return normalizeWebsiteUrl(website.url)
    } catch {
      return website.url
    }
  })()

  return (
    <PageShell>
      <section className="relative overflow-hidden pb-10 pt-32 sm:pt-40">
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#4080E0]/15 blur-[150px]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-baseline justify-between gap-6 border-t border-white/[0.12] pt-3 text-[13px] text-white/60">
            <Link href="/#portfolio" className="inline-flex items-center gap-1.5 transition-colors hover:text-white">
              <ArrowLeft className="h-3.5 w-3.5" />
              Our work
            </Link>
            {website && (
              <span className="hidden sm:block">
                {website.category}
                {website.featured ? ' · featured project' : ''}
              </span>
            )}
          </div>

          {isLoading ? (
            <div aria-busy="true">
              <div className="h-[clamp(44px,7vw,96px)] w-2/3 animate-pulse rounded-2xl bg-white/[0.04]" />
              <div className="mt-8 h-6 w-1/2 animate-pulse rounded-lg bg-white/[0.04]" />
            </div>
          ) : !website ? (
            <div>
              <h1 className="text-balance text-[clamp(40px,6vw,88px)] font-semibold leading-[0.98] tracking-[-0.035em] text-white">
                <SerifAccent text="Project *not found*." />
              </h1>
              <p className="!mt-6 max-w-xl text-lg text-white/70">This project may have been moved or taken down.</p>
              <div className="mt-10">
                <MagneticButton href="/#portfolio">
                  <ArrowLeft className="h-4 w-4" />
                  Back to our work
                </MagneticButton>
              </div>
            </div>
          ) : (
            <>
              <motion.h1
                initial={{ y: 30 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.9, ease: EASE }}
                className="max-w-5xl text-balance text-[clamp(44px,7vw,104px)] font-semibold leading-[0.98] tracking-[-0.035em] text-white"
              >
                {website.title}
                <span className="text-[#4080E0]">.</span>
              </motion.h1>
              {website.description && (
                <motion.p
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.15 }}
                  className="!mt-8 max-w-2xl text-lg leading-relaxed text-white/70 sm:text-xl"
                >
                  {website.description}
                </motion.p>
              )}

              {/* View switcher + live link */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
                className="mt-10 flex flex-wrap items-center gap-3"
              >
                <div role="tablist" aria-label="Preview size" className="flex rounded-full border border-white/10 bg-white/[0.03] p-1 backdrop-blur-xl">
                  {VIEWS.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={viewMode === id}
                      onClick={() => setViewMode(id)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                        viewMode === id ? 'bg-white text-[#04101e]' : 'text-white/65 hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
                <MagneticButton variant="ghost" href={liveUrl} className="!py-2.5">
                  Visit live site
                  <ArrowUpRight className="h-4 w-4" />
                </MagneticButton>
              </motion.div>
            </>
          )}
        </div>
      </section>

      {/* The site itself, in a navy stage */}
      {website && (
        <section className="relative pb-24 sm:pb-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
              className="rounded-[28px] border border-white/[0.08] bg-[#061225]/85 p-3 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:p-6"
            >
              <div className="mb-4 flex items-baseline justify-between gap-4 px-2 text-[13px] text-white/55">
                <span className="flex items-center gap-2">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-60" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  </span>
                  Live — scroll and click inside
                </span>
                <span className="hidden sm:inline">
                  launched {new Date(website.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="flex justify-center">
                <motion.div key={viewMode} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="flex w-full justify-center">
                  <SitePreviewFrame title={website.title} url={website.url} viewMode={viewMode} />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Closing call to action — the same blue the home page ends on */}
      <section className="relative overflow-hidden bg-[radial-gradient(120%_80%_at_50%_0%,#1d4fa3_0%,#0c2552_50%,#0a1f47_100%)] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mx-auto max-w-4xl border-none pb-0 text-balance text-[clamp(40px,6vw,88px)] font-semibold leading-[0.98] tracking-[-0.035em] text-white">
            <SerifAccent text="Want one *like this*?" />
          </h2>
          <p className="mx-auto !mt-6 max-w-xl text-lg leading-relaxed text-white/75">
            Tell us about your business and we&rsquo;ll show you a live demo of yours.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <MagneticButton href="/start">
              Start a project
              <ArrowRight className="h-4 w-4" />
            </MagneticButton>
            <MagneticButton variant="ghost" href="/#portfolio">
              More of our work
            </MagneticButton>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
