'use client'

import { Website } from '@/types'
import { CaseStudy } from '@/lib/funnelCaseStudy'
import PortfolioInfiniteScroll from '@/app/components/PortfolioInfiniteScroll'
import { ChapterBody, ChapterOpener } from '@/app/components/landing/fx/ChapterOpener'
import { BeforeAfter } from './BeforeAfter'

/**
 * "Our work": several before/after comparisons, one per real project.
 * Until real ones are marked ready, visitors see the existing portfolio
 * carousel instead; the preview page shows the sample comparisons, labelled.
 */
export function WorkSection({
  studies,
  showSamples,
  websites,
  loading,
}: {
  studies: CaseStudy[]
  showSamples: boolean
  websites: Website[]
  loading: boolean
}) {
  const ready = studies.filter((s) => s.ready)
  const list = ready.length > 0 ? ready : showSamples ? studies : []

  return (
    <section id="work" className="relative scroll-mt-20">
      <ChapterOpener
        index="01"
        label="Our work"
        aside={list.length > 0 ? 'drag the line on each one.' : undefined}
        title="Before. *After*."
        sub="Real service businesses, before and after we rebuilt their front door."
      />
      <ChapterBody className="bg-[#081833] pb-24 pt-14 sm:pb-32 sm:pt-20">
        {list.length > 0 ? (
          <div className="mx-auto flex max-w-6xl flex-col gap-20 px-4 sm:gap-28 sm:px-6 lg:px-8">
            {list.map((s) => (
              <BeforeAfter key={s.client} study={s} sample={!s.ready} />
            ))}
          </div>
        ) : loading ? (
          <div aria-hidden className="h-[328px]" />
        ) : (
          websites.length > 0 && <PortfolioInfiniteScroll websites={websites} />
        )}
      </ChapterBody>
    </section>
  )
}
