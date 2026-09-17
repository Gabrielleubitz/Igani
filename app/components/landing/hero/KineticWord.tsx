'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type KineticWordProps = {
  words: string[]
  interval?: number
  className?: string
}

function Glyphs({ word }: { word: string }) {
  return (
    <>
      {Array.from(word).map((ch, i) => (
        <span key={`${word}-${i}`} className="inline-block">
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </>
  )
}

/** Cycles through words with a per-character vertical flip, set in the display serif. */
export function KineticWord({ words, interval = 2600, className = '' }: KineticWordProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (words.length <= 1) return
    const id = window.setInterval(() => setIndex((i) => (i + 1) % words.length), interval)
    return () => window.clearInterval(id)
  }, [words.length, interval])

  const word = words[index] ?? ''
  const chars = Array.from(word)

  return (
    <span
      className={`relative inline-flex shrink-0 align-baseline font-display text-[1.06em] leading-none ${className}`}
      aria-live="polite"
    >
      {/* In-flow sizer: one nowrap line, width of the current word so the period hugs it. */}
      <span className="invisible inline-flex flex-nowrap whitespace-nowrap" aria-hidden>
        <Glyphs word={word} />
      </span>
      <span className="absolute inset-0 overflow-hidden">
        <AnimatePresence initial={false} mode="wait">
          <motion.span key={word} className="absolute inset-0 inline-flex flex-nowrap whitespace-nowrap text-[#e9f0ff]" aria-label={word}>
            {chars.map((ch, i) => (
              <motion.span
                key={`${word}-${i}`}
                className="inline-block"
                initial={{ y: '105%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '-105%', opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: i * 0.024 }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </motion.span>
            ))}
          </motion.span>
        </AnimatePresence>
      </span>
    </span>
  )
}
