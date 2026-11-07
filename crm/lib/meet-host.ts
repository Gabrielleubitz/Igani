/**
 * Edge-safe: Igani Meet's own host. meet.igani.co (or MEET_URL's host, or meet.localhost while developing) serves the
 * Meet app at its root: meet.igani.co/ is the Meet home, /login its sign-in, /<code> a call.
 */

const DEFAULT_MEET_HOST = 'meet.igani.co'

/** MEET_URL's host, when set. Setting MEET_URL is also what switches invite links and the CRM's /meet over to it. */
export function configuredMeetHost(): string | null {
  const u = process.env.MEET_URL
  if (!u) return null
  try {
    return new URL(u).host.toLowerCase()
  } catch {
    return null
  }
}

export function isMeetHost(host: string | null | undefined): boolean {
  const h = (host ?? '').toLowerCase()
  if (!h) return false
  const name = h.split(':')[0]
  return name === DEFAULT_MEET_HOST || name === 'meet.localhost' || h === configuredMeetHost()
}

/** A Meet path as the CRM spells it (/meet, /meet/<code>) → the same page on the Meet host (/, /<code>). */
export function stripMeetPrefix(pathname: string): string {
  return pathname.replace(/^\/meet(?=\/|$)/, '') || '/'
}

/** Paths under /meet that are files in public/meet (icons, logo), not pages. */
export function isFilePath(pathname: string): boolean {
  return /\.[a-z0-9]+$/i.test(pathname)
}
