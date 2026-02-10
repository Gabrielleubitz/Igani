'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ExternalLink, ArrowUpRight } from 'lucide-react'
import type { Website } from '@/types'
import { Section } from './Section'
import { T } from '@/components/T'

interface ProjectGridProps {
  websites: Website[]
  isLoading: boolean
  error: string | null
  /** Optional: section title override (e.g. from i18n) */
  title?: string
  subtitle?: string
}

export function ProjectGrid({ websites, isLoading, error, title, subtitle }: ProjectGridProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const categories = useMemo(() => {
    const set = new Set(websites.map((w) => w.category).filter(Boolean))
    return ['all', ...Array.from(set).sort()]
  }, [websites])

  const filtered = useMemo(() => {
    if (categoryFilter === 'all') return websites
    return websites.filter((w) => w.category === categoryFilter)
  }, [websites, categoryFilter])

  return (
    <Section id="portfolio" ariaLabel="Projects">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title ?? <T>Our work</T>}
            </h2>
            {subtitle && (
              <p className="mt-2 max-w-2xl text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
          {categories.length > 2 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    categoryFilter === cat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/80 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {cat === 'all' ? <T>All</T> : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card overflow-hidden animate-pulse">
                <div className="aspect-video bg-muted" />
                <div className="p-6">
                  <div className="h-5 w-2/3 rounded bg-muted" />
                  <div className="mt-2 h-4 w-full rounded bg-muted" />
                  <div className="mt-4 h-9 w-24 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-10 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-8 text-center">
            <p className="text-sm font-medium text-destructive">{error}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              <T>Projects could not be loaded. Please try again later.</T>
            </p>
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="mt-10 rounded-xl border border-border bg-muted/30 px-6 py-12 text-center">
            <p className="text-muted-foreground">
              <T>No projects to show yet.</T>
            </p>
          </div>
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project) => (
              <article
                key={project.id}
                className="glass-card group overflow-hidden transition-transform hover:scale-[1.01]"
              >
                <div className="relative aspect-video overflow-hidden bg-muted">
                  {project.image ? (
                    <Image
                      src={project.image}
                      alt={project.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <span className="text-sm">{project.title}</span>
                    </div>
                  )}
                  {project.featured && (
                    <span className="absolute top-3 right-3 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-medium text-primary-foreground">
                      <T>Featured</T>
                    </span>
                  )}
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      title="Visit site"
                      aria-label={`Open ${project.title} in new tab`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <div className="p-6">
                  {project.category && (
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {project.category}
                    </span>
                  )}
                  <h3 className="mt-2 text-lg font-semibold text-foreground">
                    {project.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {project.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/preview/${project.id}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      <T>View details</T>
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                    {project.url && (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        <T>Visit site</T>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Section>
  )
}
