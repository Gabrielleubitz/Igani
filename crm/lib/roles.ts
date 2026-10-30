import type { Role } from '@prisma/client'

/** Edge-safe route → role rules (no Prisma import so middleware can use it). */
export const ROLES = ['ADMIN', 'SALES', 'MARKETING'] as const satisfies readonly Role[]

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/** Paths that never require a session. Exact matches vs. "/dir/" prefixes. */
const PUBLIC_EXACT = new Set(['/login', '/unauthorized', '/api/v1/leads' /* secured by x-api-key */])
const PUBLIC_PREFIXES = ['/book/', '/invites/', '/api/auth/', '/api/public/'] as const

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))
}

/** Roles allowed for a protected path; null = any whitelisted role. */
export function requiredRoles(pathname: string): readonly Role[] | null {
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) return ['ADMIN']
  if (pathname.startsWith('/sales') || pathname.startsWith('/api/sales')) return null
  if (pathname.startsWith('/marketing') || pathname.startsWith('/api/marketing')) return ['ADMIN', 'MARKETING']
  return null
}

export function canAccess(role: Role | undefined | null, pathname: string): boolean {
  if (!role) return false
  const needed = requiredRoles(pathname)
  return needed === null || needed.includes(role)
}
