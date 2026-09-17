'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type KineticWordProps = {
  words: string[]
  interval?: number
  className?: string
  /** Trailing punctuation rendered in the accent color, travels with the word */
  suffix?: string
}

/** Cycles through words with a per-character vertical flip. */
export function KineticWord({ words, interval = 2400, className = '', suffix }: KineticWordProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (words.length <= 1) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval)
    return () => window.clearInterval(id)
  }, [words.length, interval])

  const word = words[index] ?? ''
  const chars = Array.from(word)

  return (
    <span className={`relative inline-block overflow-hidden align-baseline ${className}`} aria-live="polite">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={word} className="inline-flex whitespace-nowrap" aria-label={word}>
          {chars.map((ch, i) => (
            <motion.span
              key={`${word}-${i}`}
              className="inline-block bg-gradient-to-b from-white via-[#c9d8f7] to-[#80A0E0] bg-clip-text text-transparent"
              initial={{ y: '105%', opacity: 0, rotateX: -60 }}
              animate={{ y: 0, opacity: 1, rotateX: 0 }}
              exit={{ y: '-105%', opacity: 0, rotateX: 60 }}
              transition={{
                duration: 0.55,
                ease: [0.22, 1, 0.36, 1],
                delay: i * 0.028,
              }}
              style={{ transformOrigin: '50% 100%' }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </motion.span>
          ))}
          {suffix && (
            <motion.span
              className="inline-block text-[#4080E0]"
              initial={{ y: '105%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '-105%', opacity: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: chars.length * 0.028 }}
            >
              {suffix}
            </motion.span>
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
