import 'server-only'
import { NextResponse } from 'next/server'
import { currentUserOrNull, type SessionUser } from './auth'

/**
 * The Igani CRM iOS app talks to /api/mobile/v1/* with the same sign-in session the website uses (the app keeps the
 * session cookie it received at sign-in), so every permission rule is the website's own.
 */

/** NextAuth's session cookie names: secure in production (https), plain while developing. */
export const SESSION_COOKIES = ['__Secure-next-auth.session-token', 'next-auth.session-token'] as const

/** The app's URL scheme: the sign-in sheet hands the session back to igani-crm://auth. */
export const APP_CALLBACK = 'igani-crm://auth'

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'private, no-store' } })
}

export function fail(error: string, status = 400): NextResponse {
  return json({ error }, status)
}

/** The signed-in teammate, or a 401 the app answers by showing sign-in again. */
export async function mobileUser(): Promise<SessionUser | NextResponse> {
  const user = await currentUserOrNull()
  return user ?? fail('Please sign in again.', 401)
}

/** Unwraps a server action's result into the app's JSON. */
export function fromAction<T>(r: { ok: true; data: T } | { ok: false; error: string }): NextResponse {
  return r.ok ? json({ ok: true, data: r.data ?? null }) : fail(r.error, 400)
}
