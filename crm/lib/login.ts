/** Only same-site paths: never an absolute URL someone could use to bounce a sign-in elsewhere. */
export function safeCallback(value: string | string[] | undefined): string {
  const v = typeof value === 'string' ? value : '/'
  return v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : '/'
}

/** NextAuth error codes → plain words (no internals). */
export const SIGNIN_ERRORS: Record<string, string> = {
  OAuthSignin: 'Google could not start the sign-in. Please try again.',
  OAuthCallback: 'Google sign-in was interrupted. Please try again.',
  OAuthAccountNotLinked: 'This Google account is linked differently. Ask an admin to check your access.',
  AccessDenied: 'This Google account is not on the team.',
  Callback: 'Sign-in failed. Please try again.',
  SessionRequired: 'Please sign in to continue.',
}
