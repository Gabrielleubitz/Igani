'use client'

import { motion } from 'framer-motion'
import { ElementType } from 'react'

type TextRevealProps = {
  text: string
  as?: ElementType
  className?: string
  delay?: number
  /** Per-word stagger in seconds */
  stagger?: number
}

/** Word-by-word clip reveal on scroll. */
export function TextReveal({
  text,
  as: Tag = 'h2',
  className = '',
  delay = 0,
  stagger = 0.045,
}: TextRevealProps) {
  const words = text.split(' ')
  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '110%', opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: delay + i * stagger }}
          >
            {word}
            {i < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}
