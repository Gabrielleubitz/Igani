import 'server-only'

/** Best-effort per-IP limiter (per server instance): enough to stop token guessing and PDF-generation abuse. */
const hits = new Map<string, number[]>()
export function limited(ip: string, max: number, windowMs = 10 * 60_000): boolean {
  const now = Date.now()
  const list = (hits.get(ip) ?? []).filter((t) => now - t < windowMs)
  list.push(now)
  hits.set(ip, list)
  if (hits.size > 5000) hits.clear()
  return list.length > max
}

export function clientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
}

export const REASON_TEXT: Record<string, string> = {
  invalid: 'This signing link is not valid, has expired, or the agreement was already signed. Please ask Igani for a new link.',
  expired: 'This signing link has expired. Please ask Igani for a new one.',
}
