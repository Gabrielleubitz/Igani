/**
 * Phone numbers for the dialer: normalise what people type or paste to E.164, decide whether we may dial it, and
 * format it for display. Pure functions (used in the browser and on the server, where the real check happens).
 */

export const DIAL_COUNTRIES = {
  IL: { code: '972', label: 'Israel', flag: '🇮🇱' },
  US: { code: '1', label: 'US / Canada', flag: '🇺🇸' },
} as const
export type DialCountry = keyof typeof DIAL_COUNTRIES

/**
 * +1 is shared by the US, Canada and ~20 Caribbean / Atlantic countries — the classic premium-rate and "one ring"
 * fraud destinations. "US / Canada" means only US and Canadian area codes: these +1 area codes are refused.
 */
const NANP_ABROAD = new Set(['242', '246', '264', '268', '284', '345', '441', '473', '649', '658', '664', '721', '758', '767', '784', '809', '829', '849', '868', '869', '876'])
/** US special-rate and non-geographic codes (premium, personal / machine-to-machine, invalid service codes) */
const NANP_SPECIAL = new Set(['900', '976', '500', '521', '522', '523', '524', '525', '526', '527', '528', '529', '533', '544', '566', '577', '588', '700', '710', '950', '958', '959'])

/**
 * Israel allowlist (after +972): 5x mobiles, 7x VoIP, 2/3/4/8/9 landlines and 1-800 toll-free.
 * Everything else (1-900 / 1-599 premium, 1-700 shared-cost, 1-212 lines, short codes) is refused.
 */
const IL_ALLOWED = [/^5\d{8}$/, /^7[2-9]\d{7}$/, /^[23489]\d{7}$/, /^1800\d{6}$/]


/** "+972 50-123 4567", "050 1234567", "00972501234567", "(212) 555-0100" → E.164, or null if it isn't a phone number. */
export function normalizePhone(input: string, defaultCountry: DialCountry = 'IL'): string | null {
  const raw = input.trim()
  if (!raw) return null
  let d = raw.replace(/[\s\-().‎‏]/g, '')
  if (d.startsWith('00')) d = `+${d.slice(2)}`
  if (d.startsWith('+')) {
    const digits = d.slice(1)
    if (!/^\d{8,15}$/.test(digits)) return null
    // Israeli numbers are often pasted as +972 0 50 ...
    if (digits.startsWith('9720')) return `+972${digits.slice(4)}`
    return `+${digits}`
  }
  if (!/^\d+$/.test(d)) return null
  // Israel: 0 + 8–9 digits (050-123-4567, 03-123-4567)
  if (/^0\d{8,9}$/.test(d)) return `+972${d.slice(1)}`
  // US / Canada: 10 digits, or 1 + 10 digits
  if (/^1[2-9]\d{9}$/.test(d)) return `+${d}`
  if (/^[2-9]\d{9}$/.test(d)) return defaultCountry === 'US' ? `+1${d}` : null
  // Israeli mobile/landline typed without the leading 0 (50-123-4567)
  if (defaultCountry === 'IL' && /^[2-9]\d{7,8}$/.test(d)) return `+972${d}`
  return null
}

/**
 * Best reading of a stored or typed number: Israeli first (they start with 0 or +972), then US / Canada
 * (a bare 10-digit number starting 2–9 can only be American, e.g. "570-290-1979").
 */
export function toE164(input: string): string | null {
  return normalizePhone(input, 'IL') ?? normalizePhone(input, 'US')
}

/** Which allowed country an E.164 number belongs to, if any. */
export function countryOf(e164: string): DialCountry | null {
  if (e164.startsWith('+972')) return 'IL'
  if (e164.startsWith('+1')) return 'US'
  return null
}

/** Why we won't dial this number, or null when it's fine. */
export function dialProblem(e164: string | null, allowed: readonly DialCountry[]): string | null {
  if (!e164) return 'That doesn’t look like a phone number.'
  const c = countryOf(e164)
  if (!c || !allowed.includes(c)) return `Calls to this country aren’t enabled (allowed: ${allowed.map((x) => DIAL_COUNTRIES[x].label).join(', ')}).`
  if (c === 'IL') {
    const rest = e164.slice(4)
    if (/^1(9|5|7|2)/.test(rest)) return 'Premium-rate and special numbers can’t be called from the CRM.'
    if (!IL_ALLOWED.some((r) => r.test(rest))) return 'That isn’t a valid Israeli number.'
    return null
  }
  // US / Canada: NXX-NXX-XXXX, no N11 service codes, no Caribbean or premium area codes
  const m = e164.match(/^\+1([2-9]\d{2})([2-9]\d{2})\d{4}$/)
  if (!m) return 'That US number has the wrong length or format.'
  const [, area, exchange] = m as unknown as [string, string, string]
  if (NANP_ABROAD.has(area)) return 'That +1 number is in the Caribbean, not the US or Canada. Those calls aren’t enabled.'
  if (NANP_SPECIAL.has(area) || /^\d11$/.test(area) || /^\d11$/.test(exchange)) return 'Premium-rate and special numbers can’t be called from the CRM.'
  return null
}

/** Display: "+972 50-123-4567", "+1 (212) 555-0100"; anything else as given. */
export function formatPhone(e164: string): string {
  const il = e164.match(/^\+972(5\d|7\d)(\d{3})(\d{4})$/) ?? e164.match(/^\+972([2-489])(\d{3})(\d{4})$/)
  if (il) return `+972 ${il[1]}-${il[2]}-${il[3]}`
  const us = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/)
  if (us) return `+1 (${us[1]}) ${us[2]}-${us[3]}`
  return e164
}

/** Keypad display while typing: groups digits as the user goes, without forcing a format. */
export function formatAsTyped(value: string): string {
  const v = value.replace(/[^\d+*#]/g, '')
  if (/^0\d{2,}$/.test(v) && v.length <= 10) return v.length <= 3 ? v : `${v.slice(0, 3)}-${v.slice(3, 6)}${v.length > 6 ? `-${v.slice(6)}` : ''}`
  return v
}
