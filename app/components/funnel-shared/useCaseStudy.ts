'use client'

import { useEffect, useState } from 'react'
import { caseStudy, CaseStudy } from '@/lib/funnelCaseStudy'

/**
 * The case study to show in the before/after slider, or null for the generic
 * mock comparison. Shown when it's marked ready, or on ?preview=case-study.
 * Read after mount so server and client renders match.
 */
export function useCaseStudy(): CaseStudy | null {
  const [show, setShow] = useState(caseStudy.ready)
  useEffect(() => {
    if (caseStudy.ready) return
    setShow(new URLSearchParams(window.location.search).get('preview') === 'case-study')
  }, [])
  return show ? caseStudy : null
}
