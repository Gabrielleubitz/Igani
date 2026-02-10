'use client'

import { ReactNode } from 'react'

interface SectionProps {
  id?: string
  children: ReactNode
  className?: string
  /** Optional aria-label for accessibility */
  ariaLabel?: string
}

export function Section({ id, children, className = '', ariaLabel }: SectionProps) {
  return (
    <section
      id={id}
      className={`landing-section scroll-mt-20 ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </section>
  )
}
