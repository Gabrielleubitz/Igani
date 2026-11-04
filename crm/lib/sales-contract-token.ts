import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { validate, type ContractData } from './sales-contract-core'

// ─── Signed link (stateless) ────────────────────────────────────────────────

export interface LinkPayload {
  /** random link id: the only thing remembered after signing (to refuse a second use) */
  id: string
  /** expiry, epoch seconds */
  exp: number
  data: ContractData
  admin: { name: string; email: string; /** PNG data URL of the admin's drawn signature */ signature: string; signedAt: string }
}

const PNG_DATA_URL = /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/
export const MAX_SIGNATURE_CHARS = 120_000

const mac = (payload: string, key: string): string => createHmac('sha256', key).update(`sales-contract.${payload}`).digest('base64url')

export function newLinkId(): string {
  return randomBytes(12).toString('base64url')
}

export function createLinkToken(p: LinkPayload, key: string): string {
  const payload = Buffer.from(JSON.stringify(p), 'utf8').toString('base64url')
  return `${payload}.${mac(payload, key)}`
}

export type LinkResult = { ok: true; payload: LinkPayload } | { ok: false; reason: 'malformed' | 'bad-signature' | 'expired' }

export function verifyLinkToken(token: string, key: string, now: Date = new Date()): LinkResult {
  const parts = token.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'malformed' }
  const expected = Buffer.from(mac(parts[0], key))
  const given = Buffer.from(parts[1])
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { ok: false, reason: 'bad-signature' }
  let p: LinkPayload
  try {
    p = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as LinkPayload
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (!p?.id || typeof p.exp !== 'number' || !p.data || !p.admin || !PNG_DATA_URL.test(p.admin.signature ?? '') || validate(p.data)) return { ok: false, reason: 'malformed' }
  if (p.exp * 1000 <= now.getTime()) return { ok: false, reason: 'expired' }
  return { ok: true, payload: p }
}

export const usedKey = (id: string): string => `salesContractUsed:${id}`
export { PNG_DATA_URL }
