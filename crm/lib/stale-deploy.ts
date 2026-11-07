'use client'

import { unstable_isUnrecognizedActionError } from 'next/navigation'

/**
 * After a deploy, a tab left open still runs the old page code, and its server actions no longer exist on the server
 * ("Failed to find Server Action", 409). Anything in a call (phone or video) marks the page busy so it's never reloaded
 * under someone's feet.
 */
let busy = 0
export function markBusy(on: boolean): void {
  busy = Math.max(0, busy + (on ? 1 : -1))
}
export const isBusy = (): boolean => busy > 0

export function isStaleDeployError(err: unknown): boolean {
  try {
    if (unstable_isUnrecognizedActionError(err)) return true
  } catch {
    /* older runtime */
  }
  const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  return /Server Action .*(not found|was not found)|Failed to find Server Action|older or newer deployment/i.test(msg)
}
