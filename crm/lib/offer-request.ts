import 'server-only'
import { headers } from 'next/headers'
import type { Lang } from '@/offers/types'

/** Link prefix for an offer's pages: '' on its own subdomain (set by the middleware), /o/<slug> on the main domain. */
export function offerBase(slug: string): string {
  return headers().get('x-offer-base') ?? `/o/${slug}`
}

export function pickLang(param: string | string[] | undefined, fallback: Lang | undefined): Lang {
  const v = Array.isArray(param) ? param[0] : param
  return v === 'he' || v === 'en' ? v : (fallback ?? 'he')
}
