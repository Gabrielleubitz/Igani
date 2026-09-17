'use client'

import { motion } from 'framer-motion'
import { TextReveal } from './TextReveal'

type SectionHeadingProps = {
  /** Two-digit index, e.g. "01" */
  index: string
  /** Short running label, e.g. "What we actually do" */
  label: string
  /** Headline. Wrap words in *asterisks* for the italic serif. */
  title: string
  sub?: string
  /** Small right-aligned aside on the rule line, e.g. "three live demos" */
  aside?: string
  className?: string
}

/**
 * Editorial section opener: a hairline index row, then the headline.
 * Deliberately no pills, no glowing dots, no uppercase mono.
 */
export function SectionHeading({ index, label, title, sub, aside, className = '' }: SectionHeadingProps) {
  return (
    <div className={className}>
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-10 flex items-baseline justify-between gap-6 border-t border-white/[0.12] pt-3 text-[13px] text-white/60"
      >
        <span className="flex items-baseline gap-3">
          <span className="font-display text-lg leading-none text-white/80">{index}</span>
          <span>{label}</span>
        </span>
        {aside && <span className="hidden text-right sm:block">{aside}</span>}
      </motion.div>

      <div className="max-w-3xl">
        <TextReveal
          text={title}
          className="border-none pb-0 text-balance text-4xl font-semibold leading-[1.0] tracking-[-0.025em] text-white sm:text-5xl lg:text-6xl"
        />
        {sub && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-6 max-w-2xl text-lg leading-relaxed text-white/65 sm:text-xl"
          >
            {sub}
          </motion.p>
        )}
      </div>
    </div>
  )
}
