// Google OAuth scopes. No `server-only` import: the "Connect Google" button (client) and lib/auth.ts (server) share these.

/** What signing in asks for: identity only, so people get in without Google's "unverified app" warning. */
export const SIGN_IN_SCOPES = 'openid email profile'

export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events', // create events (with a Meet link)
  'https://www.googleapis.com/auth/calendar.freebusy', // read busy/free times only
] as const

export const GMAIL_READ_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

/** Asked only when someone clicks "Connect Google": identity + Calendar + read Gmail. */
export const GOOGLE_CONNECT_SCOPES = [SIGN_IN_SCOPES, ...CALENDAR_SCOPES, GMAIL_READ_SCOPE].join(' ')

/** True when a granted-scope string includes Calendar or Gmail access (anything beyond identity). */
export function grantsWorkspaceAccess(scope: string | null | undefined): boolean {
  const granted = (scope ?? '').split(/\s+/)
  return [...CALENDAR_SCOPES, GMAIL_READ_SCOPE].some((s) => granted.includes(s))
}
