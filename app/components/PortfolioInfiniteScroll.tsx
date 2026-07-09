'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'
import { Website } from '@/types'

type PortfolioInfiniteScrollProps = {
  websites: Website[]
}

const CARD_WIDTH =
  'w-[min(100%,17.5rem)] sm:w-72'

function LogoStage({
  image,
  title,
  size = 'card',
}: {
  image?: string
  title: string
  size?: 'card' | 'expanded'
}) {
  const isExpanded = size === 'expanded'

  return (
    <div
      className={[
        'flex items-center justify-center bg-[#e8ebf0]',
        isExpanded ? 'h-52 px-12 py-10 sm:h-56' : 'h-40 px-8 py-7 sm:h-44 sm:px-10',
      ].join(' ')}
    >
      {image ? (
        <img
          src={image}
          alt={title}
          loading="lazy"
          className={[
            'w-auto object-contain object-center',
            isExpanded ? 'max-h-20 max-w-[min(100%,14rem)]' : 'max-h-14 max-w-[min(100%,11rem)] sm:max-h-16',
          ].join(' ')}
        />
      ) : (
        <span
          className={[
            'text-center font-semibold text-[#1a2230]',
            isExpanded ? 'text-xl' : 'text-base',
          ].join(' ')}
        >
          {title}
        </span>
      )}
    </div>
  )
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
    <div className="space-y-10">
      <div className="portfolio-scroll-wrap relative">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#020d1c] to-transparent sm:w-16"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#020d1c] to-transparent sm:w-16"
          aria-hidden
        />

        <div className="portfolio-scroll-mask overflow-hidden py-1">
          <div className="portfolio-infinite-scroll flex w-max items-stretch gap-5 md:gap-6">
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
                    CARD_WIDTH,
                    'group flex flex-shrink-0 flex-col overflow-hidden rounded-2xl border text-left transition-all duration-300',
                    'border-white/10 bg-[#071525]/90 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.65)] backdrop-blur-md',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4080E0]',
                    isActive
                      ? 'scale-[1.02] border-[#4080E0]/50 ring-2 ring-[#4080E0]/40 ring-offset-2 ring-offset-[#020d1c]'
                      : 'hover:-translate-y-1 hover:border-[#4080E0]/35 hover:shadow-[0_16px_48px_-12px_rgba(64,128,224,0.25)]',
                  ].join(' ')}
                >
                  <LogoStage image={site.image} title={site.title} />

                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <span className="inline-flex w-fit rounded-full border border-[#4080E0]/25 bg-[#4080E0]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9ec0f5]">
                      {site.category}
                    </span>
                    <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-white">
                      {site.title}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
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
            className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-[#4080E0]/30 bg-[#071525]/95 shadow-[0_16px_56px_-12px_rgba(0,32,64,0.85)] backdrop-blur-md"
          >
            <div className="relative">
              <LogoStage image={expanded.image} title={expanded.title} size="expanded" />
              <button
                type="button"
                onClick={() => setExpandedId(null)}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#020d1c]/80 text-white/80 backdrop-blur-sm transition-colors hover:border-white/30 hover:text-white"
                aria-label="Close project card"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-6 sm:p-8">
              <span className="inline-flex w-fit rounded-full border border-[#4080E0]/25 bg-[#4080E0]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#9ec0f5]">
                {expanded.category}
              </span>
              <h3 className="text-2xl font-semibold tracking-tight text-white">{expanded.title}</h3>
              {expanded.description && (
                <p className="text-[15px] leading-relaxed text-white/72">{expanded.description}</p>
              )}
              <Link
                href={`/preview/${expanded.id}`}
                className="group inline-flex items-center gap-2 rounded-full bg-[#4080E0] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5090F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4080E0]"
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
