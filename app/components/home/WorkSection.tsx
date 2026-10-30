'use client'

import { Website } from '@/types'
import { CaseStudy } from '@/lib/funnelCaseStudy'
import PortfolioInfiniteScroll from '@/app/components/PortfolioInfiniteScroll'
import { ChapterBody, ChapterOpener } from '@/app/components/landing/fx/ChapterOpener'
import { BeforeAfter } from './BeforeAfter'

/**
 * "Our work": two before/after comparisons up top, then every site we've built
 * in the portfolio carousel (as on the original home page).
 */
export function WorkSection({
  studies,
  websites,
  loading,
}: {
  studies: CaseStudy[]
  websites: Website[]
  loading: boolean
}) {
  // Only real projects; add more in lib/caseStudies.ts as they're ready
  const list = studies.filter((s) => s.ready).slice(0, 2)

  return (
    <section id="work" className="relative scroll-mt-20">
      <ChapterOpener
        index="01"
        label="Our work"
        aside="drag the line on each one."
        title="Before. *After*."
        sub="Service businesses, before and after we rebuilt their front door."
      />
      <ChapterBody className="bg-[#081833] pb-24 pt-14 sm:pb-32 sm:pt-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-20 px-4 sm:gap-28 sm:px-6 lg:px-8">
          {list.map((s) => (
            <BeforeAfter key={s.client} study={s} sample={!s.ready} />
          ))}
        </div>

        {/* Everything we've shipped */}
        <div id="portfolio" className="scroll-mt-28 pt-24 sm:pt-32">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex items-baseline justify-between gap-6 border-t border-white/[0.12] pt-3 text-[13px] text-white/60">
              <span>Every site we&rsquo;ve built</span>
              {websites.length > 0 && <span className="hidden sm:block">{websites.length} projects · hover to pause, click to open</span>}
            </div>
          </div>
          {loading ? <div aria-hidden className="h-[328px]" /> : websites.length > 0 && <PortfolioInfiniteScroll websites={websites} />}
        </div>
      </ChapterBody>
    </section>
  )
}
