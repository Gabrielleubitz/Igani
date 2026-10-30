import { ZodError } from 'zod'
import { BookingError } from '@/lib/bookings'
import { GoogleNotConnectedError } from '@/lib/google'

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string }

/** Maps known domain errors to user-safe messages; logs everything else. */
export function toActionError(err: unknown): { ok: false; error: string } {
  if (err instanceof BookingError) return { ok: false, error: err.message }
  if (err instanceof GoogleNotConnectedError) return { ok: false, error: 'The host must reconnect Google Calendar (sign out and back in).' }
  if (err instanceof ZodError) return { ok: false, error: err.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ') }
  console.error('[action] unexpected error', err)
  return { ok: false, error: 'Something went wrong. Please try again.' }
}

/** For guest-facing actions: never reveal internal setup problems to visitors. */
export function publicActionError(err: unknown): { ok: false; error: string } {
  if (err instanceof GoogleNotConnectedError) {
    console.error('[action] host calendar not connected', err.message)
    return { ok: false, error: 'Online booking is temporarily unavailable. Please email hello@igani.co.' }
  }
  return toActionError(err)
}
