/**
 * One rule for "is this the same phone number?", however each side was typed: "+972 3-123-4567", "03-1234567",
 * "00972 3 1234567" and "+972 0 3 1234567" are one number. Matching is exact on the national number (the digits after
 * the country code and trunk 0), so a landline (8 digits) and a mobile (9) never collide on shared trailing digits.
 */
import { Prisma } from '@prisma/client'
import { toE164 } from './phone-numbers'

/** Country code and national number of an E.164 number. */
export function splitE164(e164: string): { cc: string; national: string } | null {
  const d = e164.replace(/^\+/, '')
  if (!/^\d{8,15}$/.test(d)) return null
  if (d.startsWith('972')) return { cc: '972', national: d.slice(3) }
  if (d.startsWith('1') && d.length === 11) return { cc: '1', national: d.slice(1) }
  return null
}

/**
 * A Postgres regex that the digits of a stored number match when it is this number, written any of the usual ways:
 * with or without the country code (with + or 00) and with or without the trunk 0. Null if it isn't a phone number.
 */
export function phonePattern(raw: string | null | undefined): string | null {
  const e164 = raw ? toE164(raw) : null
  if (!e164) return null
  const s = splitE164(e164)
  if (!s) return `^(00)?${e164.slice(1)}$`
  return s.cc === '972' ? `^((00)?972)?0?${s.national}$` : `^((00)?1)?${s.national}$`
}

/** True when the two strings are the same phone number. */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const p = phonePattern(a)
  return Boolean(p && b && new RegExp(p).test(b.replace(/\D/g, '')))
}

/** SQL: `column` (a text column or expression) holds this phone number. Always false for something that isn't one. */
export function phoneMatchSql(column: Prisma.Sql, raw: string | null | undefined): Prisma.Sql {
  const p = phonePattern(raw)
  if (!p) return Prisma.sql`false`
  return Prisma.sql`regexp_replace(coalesce(${column}, ''), '[^0-9]', '', 'g') ~ ${p}`
}
