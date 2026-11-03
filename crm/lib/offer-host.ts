import { slugProblem } from './offer-modules'

/**
 * Edge-safe: which offer a request's host belongs to, or null.
 * honey.app.igani.co → "honey" (production), honey.localhost:3100 → "honey" (local studio preview).
 */
export function offerSlugFromHost(host: string | null | undefined, root = process.env.OFFER_ROOT_DOMAIN ?? 'app.igani.co'): string | null {
  if (!host) return null
  const h = host.toLowerCase().split(':')[0] ?? ''
  const r = root.toLowerCase()
  let sub: string | null = null
  if (h.endsWith(`.${r}`)) sub = h.slice(0, -(r.length + 1))
  else if (h.endsWith('.localhost')) sub = h.slice(0, -'.localhost'.length)
  if (!sub || sub.includes('.') || slugProblem(sub)) return null
  return sub
}
