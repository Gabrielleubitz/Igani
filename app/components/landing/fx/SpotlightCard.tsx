'use client'

import { HTMLAttributes, MouseEvent, ReactNode, useCallback, useRef } from 'react'

type SpotlightCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  /** Glow intensity 0–1 */
  intensity?: number
  as?: 'div' | 'figure' | 'li' | 'form'
}

/**
 * Glass card whose border and surface light up where the cursor is.
 * Uses CSS custom properties so there is no React re-render on move.
 */
export function SpotlightCard({
  children,
  className = '',
  intensity = 0.28,
  as = 'div',
  ...rest
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`)
    el.style.setProperty('--my', `${e.clientY - rect.top}px`)
  }, [])

  const Tag = as as 'div'

  return (
    <Tag
      ref={ref}
      onMouseMove={onMove}
      className={`group/spot relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#061225]/70 backdrop-blur-xl ${className}`}
      style={{ ['--mx' as string]: '50%', ['--my' as string]: '50%' }}
      {...rest}
    >
      {/* Border glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{
          padding: 1,
          background: `radial-gradient(380px circle at var(--mx) var(--my), rgba(128,160,224,0.9), transparent 45%)`,
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      {/* Surface glow */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{
          background: `radial-gradient(520px circle at var(--mx) var(--my), rgba(64,128,224,${intensity}), transparent 45%)`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </Tag>
  )
}
