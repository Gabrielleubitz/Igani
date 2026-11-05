import type { OfferDefinition } from './types'

/**
 * Every offer's written content, by slug. `npm run offer:new <slug>` adds a line here;
 * keep it sorted. Lazy imports keep each offer's screens out of every other page.
 */
export const OFFERS: Record<string, () => Promise<OfferDefinition>> = {
  cryo: () => import('./cryo/content').then((m) => m.default),
  'cryotherapy-rejuvenate': () => import('./cryotherapy-rejuvenate/content').then((m) => m.default),
  testing: () => import('./testing/content').then((m) => m.default),
  'wine-grind': () => import('./wine-grind/content').then((m) => m.default),
}
