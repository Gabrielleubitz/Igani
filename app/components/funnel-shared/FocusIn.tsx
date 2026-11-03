'use client'

import { ReactNode } from 'react'
import { MotionConfig, motion } from 'framer-motion'

/**
 * On load, eases a block from slightly large and blurred into sharp focus —
 * the hero version of SettleHeadline. With reduced motion only the fade runs.
 */
export function FocusIn({ children, delay = 0.1, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        initial={{ scale: 1.14, opacity: 0.15, filter: 'blur(12px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1.4, delay, ease: [0.22, 1, 0.36, 1] }}
        className={className}
      >
        {children}
      </motion.div>
    </MotionConfig>
  )
}
