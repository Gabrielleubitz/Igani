'use client'

import { motion, type Transition } from 'motion/react'

/** The Igani Meet mark as live SVG; with `talk` the two pills bounce like a level meter. */
export function MeetMark({ className, talk = false, slot = '#0f1a2d' }: { className?: string; talk?: boolean; slot?: string }): React.ReactElement {
  const bob = (d: number): Transition => ({ duration: 0.9, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: d })
  const pill = { transformBox: 'fill-box', transformOrigin: '50% 100%' } as const
  return (
    <svg viewBox="480 315 1062 1302" className={className} aria-hidden>
      <motion.g style={pill} animate={talk ? { scaleY: [1, 0.82, 1.04, 0.9] } : undefined} transition={bob(0)}>
        <rect x="500" y="431" width="327" height="1166" rx="163" fill="#8DB6F7" />
        <rect x="603" y="565" width="104" height="290" rx="52" fill={slot} />
      </motion.g>
      <motion.g style={pill} animate={talk ? { scaleY: [0.9, 1.03, 0.84, 1] } : undefined} transition={bob(0.25)}>
        <rect x="900" y="335" width="325" height="1262" rx="162" fill="#6592E0" />
        <rect x="1001" y="1143" width="104" height="294" rx="52" fill={slot} />
      </motion.g>
      <path d="M1290 690 L1500 572 L1500 962 L1290 844 Z" fill="#6592E0" stroke="#6592E0" strokeWidth="44" strokeLinejoin="round" />
    </svg>
  )
}
