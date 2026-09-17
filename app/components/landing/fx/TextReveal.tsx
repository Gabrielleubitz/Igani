'use client'

import { motion } from 'framer-motion'
import { ElementType, Fragment } from 'react'

type TextRevealProps = {
  /** Wrap words in *asterisks* to set them in the italic display serif. */
  text: string
  as?: ElementType
  className?: string
  delay?: number
  /** Per-word stagger in seconds */
  stagger?: number
}

type Chunk = { text: string; italic: boolean }
/** A visual word: one or more chunks with no whitespace between them (e.g. "*promises*." or "ה*עבודות*"). */
type Word = Chunk[]

function parse(text: string): Word[] {
  const words: Word[] = []
  let current: Word = []
  const flush = () => {
    if (current.length) words.push(current)
    current = []
  }
  text.split('*').forEach((seg, i) => {
    const italic = i % 2 === 1
    seg.split(/(\s+)/).forEach((part) => {
      if (!part) return
      if (/^\s+$/.test(part)) flush()
      else current.push({ text: part, italic })
    })
  })
  flush()
  return words
}

/** Word-by-word clip reveal on scroll, with optional serif-italic words. */
export function TextReveal({
  text,
  as: Tag = 'h2',
  className = '',
  delay = 0,
  stagger = 0.045,
}: TextRevealProps) {
  const words = parse(text)
  return (
    <Tag className={className}>
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="inline-block overflow-hidden pb-[0.14em] align-bottom">
            <motion.span
              className="inline-block"
              initial={{ y: '110%', opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: delay + i * stagger }}
            >
              {word.map((chunk, k) => (
                <span
                  key={k}
                  className={chunk.italic ? 'font-display pr-[0.04em] text-[1.08em] font-normal text-[#dbe6ff]' : undefined}
                >
                  {chunk.text}
                </span>
              ))}
            </motion.span>
          </span>
          {i < words.length - 1 ? ' ' : ''}
        </Fragment>
      ))}
    </Tag>
  )
}
