'use client'

import { useEffect } from 'react'
import { startSiteTracker } from '@/lib/site-tracker-core'

/** Visitor analytics for igani.co pages, managed from the CRM (Admin → Website). The logic lives in lib/site-tracker-core.ts. */
export function SiteTracker({ page }: { page: 'home' | 'realestate' }): null {
  useEffect(() => startSiteTracker(page), [page])
  return null
}
