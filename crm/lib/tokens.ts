import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { env } from './env'

/** Signed invite tokens: `<bookingId>.<expiresEpochSec>.<nonce>.<hmac>` (base64url). */

function secret(): string {
  const e = env()
  return e.INVITE_TOKEN_SECRET ?? e.NEXTAUTH_SECRET
}

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url')
}

export function createInviteToken(bookingId: string, expiresAt: Date, key: string = secret()): string {
  const payload = `${bookingId}.${Math.floor(expiresAt.getTime() / 1000)}.${randomBytes(12).toString('base64url')}`
  return `${payload}.${sign(payload, key)}`
}

export type InviteTokenResult =
  | { ok: true; bookingId: string; expiresAt: Date }
  | { ok: false; reason: 'malformed' | 'bad-signature' | 'expired' }

export function verifyInviteToken(token: string, now: Date = new Date(), key: string = secret()): InviteTokenResult {
  const parts = token.split('.')
  if (parts.length !== 4) return { ok: false, reason: 'malformed' }
  const [bookingId, exp, nonce, mac] = parts as [string, string, string, string]
  if (!bookingId || !/^\d+$/.test(exp) || !nonce || !mac) return { ok: false, reason: 'malformed' }
  const expected = Buffer.from(sign(`${bookingId}.${exp}.${nonce}`, key))
  const given = Buffer.from(mac)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: 'bad-signature' }
  const expiresAt = new Date(Number(exp) * 1000)
  if (expiresAt.getTime() <= now.getTime()) return { ok: false, reason: 'expired' }
  return { ok: true, bookingId, expiresAt }
}

/** Constant-time comparison for shared secrets such as the webhook API key. */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHmac('sha256', 'cmp').update(a).digest()
  const hb = createHmac('sha256', 'cmp').update(b).digest()
  return timingSafeEqual(ha, hb)
}
