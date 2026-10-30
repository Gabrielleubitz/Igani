'use client'

import { useEffect, useState } from 'react'

/**
 * Reduced-motion preference read after mount, so the server render and the
 * first client render match (framer's useReducedMotion differs between them).
 */
export function useReducedMotionSafe() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduce(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  return reduce
}
