import { describe, expect, it } from 'vitest'
import { DEFAULT_FIGURES, namesMatch, agreementHtml as html, basePayout, validate, type ContractData } from '@/lib/sales-contract-core'
import { isLinkCode, linkKey, newLinkCode, parseLink } from '@/lib/sales-contract-token'

const data: ContractData = { name: 'Ariel Tzadok', email: 'ariel@example.com', effectiveDate: '2026-10-31', figures: DEFAULT_FIGURES }
const NOW = new Date('2026-11-01T00:00:00Z')

describe('commission wording', () => {
  const view = { logo: '/igani-logo%202.png', status: 'pending' as const, reference: 'ABC12345', admin: { name: 'Gabriel', email: 'g@igani.co', signature: null, signedAt: null }, rep: { name: 'Ariel Tzadok', email: 'a@b.co', signature: null, signedAt: null } }
  const agreementHtml = (d: ContractData): string => html(d, view)
  const text = agreementHtml(data).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
  it('matches the reference agreement for Ariel’s figures', () => {
    expect(basePayout(data.figures)).toBe(4500)
    expect(text).toContain('Representative: Ariel Tzadok | Effective Date: October 31, 2026')
    expect(agreementHtml(data)).toContain('class="logo"')
    expect(text).toContain('Awaiting signature')
    expect(text).toContain('Deals up to 15,000 ILS: Representative receives 30% total commission.')
    expect(text).toContain('Base payout of 4,500 ILS (30% of 15,000 ILS) plus an additional 1,000 ILS bonus for every completed 5,000 ILS increment above 15,000 ILS.')
    expect(text).toContain('paid only after the client has paid in full everything owed')
    expect(text).not.toMatch(/Milestone|downpayment/i)
  })
  it('changes only the injected values and escapes them', () => {
    const t = agreementHtml({ ...data, name: '<b>X</b>', figures: { ...data.figures, threshold: 20000, basePercent: 25 } })
    expect(t).toContain('&lt;b&gt;X&lt;/b&gt;')
    expect(t).toContain('5,000 ILS (25% of 20,000 ILS)')
  })
  it('validates input', () => {
    expect(validate(data)).toBeNull()
    expect(validate({ ...data, email: 'nope' })).toMatch(/email/)
    expect(validate({ ...data, figures: { ...data.figures, basePercent: 0 } })).toMatch(/base commission/)
    expect(validate({ ...data, effectiveDate: '' })).toMatch(/date/)
  })
})

describe('short signing link', () => {
  const signature = 'data:image/png;base64,iVBORw0KGgo='
  const record = { exp: Math.floor(NOW.getTime() / 1000) + 3600, data, admin: { name: 'Gabriel', email: 'g@igani.co', signature, signedAt: '2026-10-31T10:00:00Z' } }
  it('makes short unguessable codes', () => {
    const c = newLinkCode()
    expect(c).toHaveLength(12)
    expect(isLinkCode(c)).toBe(true)
    expect(new Set(Array.from({ length: 50 }, newLinkCode)).size).toBe(50)
    expect(isLinkCode('../etc/passwd')).toBe(false)
    expect(linkKey(c)).toBe(`salesContractLink:${c}`)
  })
  it('accepts a good record and rejects expired or damaged ones', () => {
    expect(parseLink('abc123abc123', record, NOW)).toMatchObject({ ok: true, payload: { id: 'abc123abc123' } })
    expect(parseLink('abc123abc123', { ...record, exp: record.exp - 7200 }, NOW)).toMatchObject({ ok: false, reason: 'expired' })
    expect(parseLink('abc123abc123', { ...record, admin: { ...record.admin, signature: 'javascript:1' } }, NOW)).toMatchObject({ ok: false, reason: 'invalid' })
    expect(parseLink('abc123abc123', { ...record, data: { ...data, email: 'x' } }, NOW)).toMatchObject({ ok: false, reason: 'invalid' })
    expect(parseLink('abc123abc123', null, NOW)).toMatchObject({ ok: false, reason: 'invalid' })
  })
})

describe('name confirmation', () => {
  it('requires the exact name, ignoring only stray spaces', () => {
    expect(namesMatch('  Ariel   Tzadok ', 'Ariel Tzadok')).toBe(true)
    expect(namesMatch('ariel tzadok', 'Ariel Tzadok')).toBe(false)
    expect(namesMatch('Ariel', 'Ariel Tzadok')).toBe(false)
  })
})
