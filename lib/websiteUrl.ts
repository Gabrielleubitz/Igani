const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
])

export function normalizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const parsed = new URL(withProtocol)

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('URL must use http or https')
  }

  return parsed.toString()
}

export function isEmbeddablePreviewUrl(rawUrl: string): boolean {
  try {
    const normalized = normalizeWebsiteUrl(rawUrl)
    const { hostname } = new URL(normalized)
    if (BLOCKED_HOSTNAMES.has(hostname)) return false
    return true
  } catch {
    return false
  }
}
