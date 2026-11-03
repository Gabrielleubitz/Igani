/**
 * Admin panel session for the marketing site (server-only: never import from a client component).
 *
 * The password is checked on the server; on success the browser gets an httpOnly cookie holding
 * `<expiresAtMs>.<HMAC-SHA256(secret, expiresAtMs)>`. Middleware checks that cookie before any
 * /api/admin/* call. Uses Web Crypto so it runs in both the Edge middleware and Node routes.
 */

export const ADMIN_COOKIE = 'igani_admin'
export const ADMIN_SESSION_MS = 12 * 60 * 60 * 1000

/** The admin password (ADMIN_PASSWORD; the old NEXT_PUBLIC_ name is still read so nothing breaks before env is renamed). */
export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ''
}

/** Signing key: a dedicated secret if set, otherwise derived from the password (changing it logs everyone out). */
export function adminSecret(): string {
  const p = adminPassword()
  return process.env.ADMIN_SESSION_SECRET || (p ? `igani-admin:${p}` : '')
}

const enc = new TextEncoder()

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time string compare (length leak only). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function createAdminToken(secret: string, now = Date.now()): Promise<string> {
  const exp = String(now + ADMIN_SESSION_MS)
  return `${exp}.${await hmacHex(secret, exp)}`
}

export async function verifyAdminToken(token: string | undefined | null, secret: string, now = Date.now()): Promise<boolean> {
  if (!token || !secret) return false
  const dot = token.indexOf('.')
  if (dot <= 0) return false
  const exp = token.slice(0, dot)
  if (!/^\d{13}$/.test(exp) || Number(exp) <= now) return false
  return safeEqual(token.slice(dot + 1), await hmacHex(secret, exp))
}

/**
 * Which /api/admin/* calls need the admin cookie. Excluded: the login route itself, routes with their own auth
 * (projects = API key, crm-sync = admin password header, vercel = bearer key) and the public reads of
 * site/offer settings that the public website uses.
 */
export function adminApiNeedsSession(pathname: string, method: string): boolean {
  if (!pathname.startsWith('/api/admin')) return false
  if (method === 'OPTIONS') return false
  const own = ['/api/admin/session', '/api/admin/projects', '/api/admin/crm-sync', '/api/admin/vercel']
  if (own.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false
  const publicReads = ['/api/admin/site-settings', '/api/admin/offer-settings']
  if ((method === 'GET' || method === 'HEAD') && publicReads.includes(pathname)) return false
  return true
}
