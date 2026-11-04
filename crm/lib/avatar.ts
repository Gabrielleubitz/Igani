/**
 * Teammates' profile photos (from their Google account). Served from our own URL, /api/public/avatar/<userId>?v=…,
 * so the CRM and emails get one small, square, cached image: no Google sizing quirks, no expired links, and the
 * version changes when the photo does (so a new photo shows up at once).
 */
import { createHash } from 'node:crypto'
import { prisma } from './prisma'

/** Public base for links that leave the app (emails): never localhost. */
const PUBLIC_BASE = 'https://app.igani.co'

/** Only Google's photo hosts are ever fetched. */
export function isGooglePhoto(url: string | null | undefined): url is string {
  if (!url) return false
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && /^lh\d\.googleusercontent\.com$/.test(u.hostname)
  } catch {
    return false
  }
}

/** Ask Google for a crisp square of `size` px (their URLs end in "=s96-c" or similar). */
export function googlePhotoAtSize(url: string, size = 256): string {
  const u = new URL(url)
  if (/=[swhc0-9-]+$/.test(u.pathname)) u.pathname = u.pathname.replace(/=[swhc0-9-]+$/, `=s${size}-c`)
  else u.pathname = `${u.pathname}=s${size}-c`
  u.search = ''
  return u.toString()
}

const version = (image: string): string => createHash('sha256').update(image).digest('hex').slice(0, 10)

/** The photo's URL in the CRM (relative), or null when the teammate has no photo. */
export function avatarPath(user: { id: string; image: string | null }): string | null {
  return isGooglePhoto(user.image) ? `/api/public/avatar/${user.id}?v=${version(user.image)}` : null
}

/** The photo's absolute URL for emails, or null (initials are shown instead). */
export function avatarEmailUrl(user: { id: string; image: string | null }): string | null {
  const p = avatarPath(user)
  if (!p) return null
  const base = process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost') ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '') : PUBLIC_BASE
  return `${base}${p}`
}

/** For emails sent on someone's behalf when only their address is known. */
export async function avatarEmailUrlFor(email: string | null | undefined): Promise<string | null> {
  if (!email) return null
  const u = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true, image: true } })
  return u ? avatarEmailUrl(u) : null
}
