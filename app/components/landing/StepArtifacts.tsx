'use client'

/**
 * Small hand-drawn-feeling sketches, one per process step.
 * Kept deliberately imperfect: uneven strokes, a stray tick mark here and there.
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function DiscoverSketch({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden>
      {/* a scribbled notes page */}
      <path {...stroke} d="M22 12h96l3 3v72l-4 3H20V15z" />
      <path {...stroke} d="M34 30h60M34 44h72M34 58h48M34 72h64" opacity="0.7" />
      <path {...stroke} d="M108 56c6-6 14-4 16 2s-4 12-10 10-9-7-6-12z" opacity="0.9" />
      <path {...stroke} d="M118 32l14-14" opacity="0.6" />
      <path {...stroke} d="M126 22l6-4 2 7" opacity="0.6" />
    </svg>
  )
}

export function DesignSketch({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden>
      {/* wireframe frames */}
      <path {...stroke} d="M14 18h64v60H14z" />
      <path {...stroke} d="M22 28h22v14H22zM22 50h48v5M22 60h40v5" opacity="0.7" />
      <path {...stroke} d="M92 30h54v44H92z" opacity="0.85" />
      <path {...stroke} d="M100 40h38v3M100 48h30v3M100 60h18v8" opacity="0.6" />
      <path {...stroke} d="M78 44c6 0 8-2 14-2" opacity="0.6" />
      <path {...stroke} d="M88 38l6 4-6 4" opacity="0.6" />
    </svg>
  )
}

export function BuildSketch({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden>
      {/* a terminal with a blinking cursor */}
      <path {...stroke} d="M16 20h128v62H16z" />
      <path {...stroke} d="M16 32h128" opacity="0.5" />
      <path {...stroke} d="M28 46l8 6-8 6" />
      <path {...stroke} d="M44 52h40M44 64h26" opacity="0.7" />
      <path {...stroke} d="M74 64h8" className="animate-pulse" />
      <circle cx="26" cy="26" r="1.6" fill="currentColor" opacity="0.6" />
      <circle cx="33" cy="26" r="1.6" fill="currentColor" opacity="0.6" />
      <circle cx="40" cy="26" r="1.6" fill="currentColor" opacity="0.6" />
    </svg>
  )
}

export function QaSketch({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden>
      {/* phone + laptop + a checklist */}
      <path {...stroke} d="M20 26h20v56H20zM26 76h8" />
      <path {...stroke} d="M52 30h60v36H52zM44 74h76" opacity="0.85" />
      <path {...stroke} d="M122 36h22M122 48h22M122 60h22" opacity="0.5" />
      <path {...stroke} d="M116 33l3 3 5-6M116 45l3 3 5-6" />
      <path {...stroke} d="M116 58l3 3 5-6" opacity="0.5" strokeDasharray="1 3" />
    </svg>
  )
}

export function LaunchSketch({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 100" className={className} aria-hidden>
      {/* a paper plane and a dotted flight path */}
      <path {...stroke} d="M18 78c20-10 40-24 70-40" strokeDasharray="2 5" opacity="0.6" />
      <path {...stroke} d="M92 36l50-18-22 46-10-18z" />
      <path {...stroke} d="M110 46l32-28" opacity="0.7" />
      <path {...stroke} d="M126 74c4-2 8-2 12 0" opacity="0.5" />
    </svg>
  )
}

export const STEP_SKETCHES = [DiscoverSketch, DesignSketch, BuildSketch, QaSketch, LaunchSketch]
