import { describe, expect, it } from 'vitest'
import { DEFAULT_FIGURES, agreementBodyHtml, basePayout, validate, type ContractData } from '@/lib/sales-contract-core'
import { createLinkToken, usedKey, verifyLinkToken, type LinkPayload } from '@/lib/sales-contract-token'

const KEY = 'test-secret-test-secret'
const data: ContractData = { name: 'Ariel Tzadok', email: 'ariel@example.com', effectiveDate: '2026-10-31', figures: DEFAULT_FIGURES }
const png = 'data:image/png;base64,iVBORw0KGgo='
const payload = (exp: number): LinkPayload => ({ id: 'abc123', exp, data, admin: { name: 'Gabriel', email: 'g@igani.co', signature: png, signedAt: '2026-10-31T10:00:00Z' } })
const NOW = new Date('2026-11-01T00:00:00Z')
const future = Math.floor(NOW.getTime() / 1000) + 3600

describe('commission wording', () => {
  const text = agreementBodyHtml(data).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
  it('matches the reference agreement for Ariel’s figures', () => {
    expect(basePayout(data.figures)).toBe(4500)
    expect(text).toContain('Representative: Ariel Tzadok | Effective Date: October 31, 2026')
    expect(text).toContain('Deals up to 15,000 ILS: Representative receives 30% total commission.')
    expect(text).toContain('Base payout of 4,500 ILS (30% of 15,000 ILS) plus an additional 1,000 ILS bonus for every completed 5,000 ILS increment above 15,000 ILS.')
    expect(text).toContain('the representative receives 30% of the collected downpayment amount')
  })
  it('changes only the injected values and escapes them', () => {
    const t = agreementBodyHtml({ ...data, name: '<b>X</b>', figures: { ...data.figures, threshold: 20000, basePercent: 25 } })
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

describe('signing link token', () => {
  it('round-trips', () => {
    const t = createLinkToken(payload(future), KEY)
    expect(verifyLinkToken(t, KEY, NOW)).toMatchObject({ ok: true, payload: { id: 'abc123' } })
  })
  it('rejects tampering, wrong key, expiry and garbage', () => {
    const t = createLinkToken(payload(future), KEY)
    const [body, mac] = t.split('.')
    const forged = Buffer.from(JSON.stringify({ ...payload(future), data: { ...data, figures: { ...data.figures, bonus: 99999 } } })).toString('base64url')
    expect(verifyLinkToken(`${forged}.${mac}`, KEY, NOW)).toMatchObject({ ok: false, reason: 'bad-signature' })
    expect(verifyLinkToken(t, 'another-secret-entirely', NOW)).toMatchObject({ ok: false, reason: 'bad-signature' })
    expect(verifyLinkToken(createLinkToken(payload(future - 7200), KEY), KEY, NOW)).toMatchObject({ ok: false, reason: 'expired' })
    expect(verifyLinkToken('garbage', KEY, NOW)).toMatchObject({ ok: false, reason: 'malformed' })
    expect(body).toBeTruthy()
  })
  it('keys the used mark by link id only', () => {
    expect(usedKey('abc123')).toBe('salesContractUsed:abc123')
  })
})
