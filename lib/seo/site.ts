export const SITE_NAME = 'IGANI'

const PRODUCTION_URL = 'https://www.igani.co'

/** Canonical site URL — never localhost in production builds. */
export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (appUrl && !appUrl.includes('localhost') && !appUrl.includes('127.0.0.1')) {
    return appUrl
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  if (process.env.NODE_ENV === 'production') {
    return PRODUCTION_URL
  }

  return appUrl || PRODUCTION_URL
}

export const SITE_URL = getSiteUrl()
