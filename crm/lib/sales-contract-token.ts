import { randomBytes } from 'node:crypto'
import { validate, type ContractData } from './sales-contract-core'

export interface LinkPayload {
  /** the short code in the signing link */
  id: string
  /** expiry, epoch seconds */
  exp: number
  data: ContractData
  admin: { name: string; email: string; /** PNG data URL of Igani's saved signature */ signature: string; signedAt: string }
}

export const PNG_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/
export const MAX_SIGNATURE_CHARS = 400_000
export const LINK_HOURS = 12
export const LINK_PREFIX = 'salesContractLink:'

/** 12 random base64url characters (72 bits): the whole signing link is about 40 characters. */
export const newLinkCode = (): string => randomBytes(9).toString('base64url')
export const isLinkCode = (c: string): boolean => /^[A-Za-z0-9_-]{12}$/.test(c)
export const linkKey = (code: string): string => `${LINK_PREFIX}${code}`

/** Checks a stored record (JSON from the database) and returns it typed, or why it is unusable. */
export function parseLink(code: string, value: unknown, now: Date = new Date()): { ok: true; payload: LinkPayload } | { ok: false; reason: 'invalid' | 'expired' } {
  const p = value as Partial<LinkPayload> | null
  if (!p || typeof p.exp !== 'number' || !p.data || !p.admin || !PNG_DATA_URL.test(p.admin.signature ?? '') || validate(p.data)) return { ok: false, reason: 'invalid' }
  if (p.exp * 1000 <= now.getTime()) return { ok: false, reason: 'expired' }
  return { ok: true, payload: { ...(p as LinkPayload), id: code } }
}
