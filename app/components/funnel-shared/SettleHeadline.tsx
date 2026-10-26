'use client'

import { ReactNode } from 'react'
import { MotionValue, motion, useTransform } from 'framer-motion'
import { PinnedStage } from './PinnedStage'

function Settle({ progress, children, cue }: { progress: MotionValue<number>; children: ReactNode; cue?: ReactNode }) {
  const scale = useTransform(progress, [0, 0.55], [1.14, 1], { clamp: true })
  const opacity = useTransform(progress, [0, 0.45], [0.2, 1], { clamp: true })
  const blur = useTransform(progress, [0, 0.45], [10, 0], { clamp: true })
  const filter = useTransform(blur, (b) => `blur(${b}px)`)
  const cueOpacity = useTransform(progress, [0.55, 0.85], [0, 1], { clamp: true })
  const cueY = useTransform(progress, [0.55, 0.85], [12, 0], { clamp: true })

  return (
    <div className="mx-auto w-full max-w-5xl px-4 text-center sm:px-6">
      <motion.div style={{ scale, opacity, filter }}>{children}</motion.div>
      {cue && (
        <motion.div style={{ opacity: cueOpacity, y: cueY }} className="mt-10">
          {cue}
        </motion.div>
      )}
    </div>
  )
}

/**
 * The closing beat: the headline holds the screen on its own and comes into
 * focus as you scroll, then a cue invites the visitor down to the form.
 */
export function SettleHeadline({
  children,
  cue,
  backdrop,
  className = '',
}: {
  children: ReactNode
  cue?: ReactNode
  /** Decoration held behind the headline while it is pinned (e.g. a marquee). */
  backdrop?: ReactNode
  className?: string
}) {
  return (
    <PinnedStage screens={0.7} className={`relative overflow-clip ${className}`}>
      {(progress) => (
        <>
          {backdrop}
          <Settle progress={progress} cue={cue}>
            {children}
          </Settle>
        </>
      )}
    </PinnedStage>
  )
}
