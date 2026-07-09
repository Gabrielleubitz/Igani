'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'
import { Website } from '@/types'

type PortfolioInfiniteScrollProps = {
  websites: Website[]
}

export default function PortfolioInfiniteScroll({ websites }: PortfolioInfiniteScrollProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (websites.length === 0) return null

  const expanded = websites.find((site) => site.id === expandedId) ?? null
  const duplicated = [...websites, ...websites]

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="space-y-8">
      <div className="portfolio-scroll-mask relative w-full overflow-hidden py-2">
        <div className="portfolio-infinite-scroll flex w-max gap-4 md:gap-6">
          {duplicated.map((site, index) => {
            const isActive = expandedId === site.id
            return (
              <button
                key={`${site.id}-${index}`}
                type="button"
                onClick={() => toggleExpand(site.id)}
                aria-expanded={isActive}
                aria-label={`${site.title} — ${isActive ? 'collapse' : 'expand'} project details`}
                className={[
                  'group relative h-48 w-48 flex-shrink-0 overflow-hidden rounded-xl shadow-2xl transition-all duration-300 md:h-64 md:w-64 lg:h-80 lg:w-80',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4080E0]',
                  isActive
                    ? 'ring-2 ring-[#4080E0] ring-offset-2 ring-offset-[#020d1c] scale-[1.02]'
                    : 'hover:scale-105 hover:brightness-110',
                ].join(' ')}
              >
                {site.image ? (
                  <img
                    src={site.image}
                    alt={site.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#4080E0]/30 to-[#002040]/60">
                    <span className="px-4 text-center text-lg font-semibold text-white/90">
                      {site.title}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#010814]/90 via-[#010814]/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
                  <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[#80A0E0]">
                    {site.category}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-white">{site.title}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {expanded && (
          <motion.div
            key={expanded.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-[#4080E0]/30 bg-[#020d1c]/90 shadow-[0_8px_48px_-8px_rgba(0,32,64,0.8)] backdrop-blur-md"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-[#010814]">
              {expanded.image ? (
                <img
                  src={expanded.image}
                  alt={expanded.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#4080E0]/25 to-[#002040]/50">
                  <span className="text-2xl font-semibold text-white/80">{expanded.title}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setExpandedId(null)}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#010814]/80 text-white/80 backdrop-blur-sm transition-colors hover:border-white/30 hover:text-white"
                aria-label="Close project card"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 sm:p-8">
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#80A0E0]">
                {expanded.category}
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                {expanded.title}
              </h3>
              {expanded.description && (
                <p className="mt-4 line-clamp-3 text-[15px] leading-relaxed text-white/72">
                  {expanded.description}
                </p>
              )}
              <Link
                href={`/preview/${expanded.id}`}
                className="group mt-6 inline-flex items-center gap-2 rounded-full bg-[#4080E0] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5090F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4080E0]"
              >
                View project
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
