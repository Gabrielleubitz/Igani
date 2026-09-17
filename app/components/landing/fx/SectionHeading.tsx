'use client'

import { motion } from 'framer-motion'
import { TextReveal } from './TextReveal'

type SectionHeadingProps = {
  kicker: string
  title: string
  sub?: string
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeading({ kicker, title, sub, align = 'left', className = '' }: SectionHeadingProps) {
  const alignCls = align === 'center' ? 'mx-auto text-center' : ''
  return (
    <div className={`max-w-3xl ${alignCls} ${className}`}>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#4080E0]/30 bg-[#4080E0]/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.25em] text-[#9ec0f5]"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#4080E0] shadow-[0_0_12px_#4080E0]" />
        {kicker}
      </motion.p>
      <TextReveal
        text={title}
        className="border-none pb-0 text-balance text-4xl font-semibold leading-[1.02] tracking-[-0.02em] text-white sm:text-5xl lg:text-6xl"
      />
      {sub && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-6 text-lg leading-relaxed text-white/70 sm:text-xl"
        >
          {sub}
        </motion.p>
      )}
    </div>
  )
}
