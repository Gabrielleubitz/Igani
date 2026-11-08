import { describe, expect, it } from 'vitest'
import { DEFAULT_FIGURES, type LegalTerms, namesMatch, agreementHtml as html, validate, type ContractData } from '@/lib/sales-contract-core'
import { isLinkCode, linkKey, newLinkCode, parseLink } from '@/lib/sales-contract-token'

const TERMS: LegalTerms = { companyLegalName: 'Test Person', companyTradingAs: 'Test Brand', companyIdNumber: '123456789', companyAddress: '1 Test Street, Test City', agentAddress: '2 Rep Street, Rep City', payoutDays: 10, clawbackDays: 60, noticeDays: 30, jurisdiction: 'Test Jurisdiction' }
const data: ContractData = { name: 'Ariel Tzadok', email: 'ariel@example.com', effectiveDate: '2026-10-31', figures: DEFAULT_FIGURES, terms: TERMS }
const NOW = new Date('2026-11-01T00:00:00Z')

describe('commission wording', () => {
  const view = { logo: '/igani-logo%202.png', status: 'pending' as const, reference: 'ABC12345', admin: { name: 'Gabriel', email: 'g@igani.co', signature: null, signedAt: null }, rep: { name: 'Ariel Tzadok', email: 'a@b.co', signature: null, signedAt: null } }
  const agreementHtml = (d: ContractData): string => html(d, view)
  const text = agreementHtml(data).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
  it('matches the reference agreement for Ariel’s figures', () => {
    expect(text).toContain('Representative: Ariel Tzadok | Effective Date: October 31, 2026')
    expect(text).toContain('Commission Agreement')
    expect(agreementHtml(data)).toContain('class="logo"')
    expect(text).toContain('Awaiting signature')
    expect(text).toContain('Rate: the Sales Representative receives 30% of every payment the client pays')
    expect(text).toContain('Bonus, paid at the end only: if the contract price is above 15,000 ILS')
    expect(text).toContain('a 1,000 ILS bonus for every completed 5,000 ILS of the contract price above 15,000 ILS')
    expect(text).toContain('The bonus is paid only together with the commission on the final payment, once the client has paid the whole contract price. It is never paid in part or in advance')
    expect(text).toContain('if the client pays half of the contract price upfront, the Sales Representative earns the commission rate on that half')
    expect(text).not.toContain('base payout')
    expect(text).toContain('Test Person, trading as Test Brand (dba Igani), 1 Test Street, Test City, registered no. 123456789 (the “Company”)')
    expect(text).toContain('wherever in the world that client is located or based')
    expect(text).toContain('The Sales Representative is an independent freelancer, engaged by the Company for their services')
    expect(text).toContain('The Company does not employ the Sales Representative, and nothing in this agreement creates an employment relationship')
    expect(text).toContain('works at their own times and in their own way without the Company’s supervision')
    expect(text).toContain('only by bank transfer to the business bank account of the Sales Representative’s registered business')
    expect(text).toContain('does not pay commission in cash or to a private account')
    expect(text).toContain('whatever country the client is in')
    expect(text.match(/dba Igani/g)?.length ?? 0).toBeGreaterThanOrEqual(3)
    expect(text).toContain('the Company has received that payment from the referred client in cleared funds')
    expect(text).not.toContain('full amount owed by the referred client')
    expect(text).toContain('Recurring maintenance: the Sales Representative receives 30% of every recurring maintenance payment the client pays')
    expect(text).toContain('earns commission on each of those payments at the same rate (30%)')
    expect(text).toContain('No bonus applies to maintenance payments')
    expect(text).toContain('commission on every payment that cleared before the termination takes effect')
    expect(text).toContain('The bonus is earned only if the client had paid the whole contract price before the termination takes effect')
    expect(text).toContain('commission is calculated on profit, not on the gross payment')
    expect(text).toContain('if, when that client signs, the client’s lead is assigned to the Sales Representative in the Company’s CRM')
    expect(text).toContain('A lead the Sales Representative sourced, meaning one they found themselves or brought into the CRM through their own calls, contacts or referrals, stays assigned to them: the Company will not reassign it')
    expect(text).toContain('The Company may reassign a lead it gave the Sales Representative only until the client signs')
    expect(text).toContain('from the moment the client signs, that lead too stays assigned to the Sales Representative and the Company will not reassign it')
    expect(text).toContain('If this agreement ends, the Company may reassign the Sales Representative’s leads')
    expect(text).not.toContain('the Company may reassign a lead before the client signs')
    expect(text).toContain('On request, the Sales Representative gives the Company a copy of their business registration certificate')
    expect(text).toContain('gives the Sales Representative a written statement showing how each month’s commission was calculated')
    expect(text).toContain('This includes maintenance paid in advance for several months. If any of it is later refunded, Section 5 applies')
    expect(text).toContain('the period runs from the day the Company receives it')
    expect(text).toContain('repays the amount within 14 days of the Company’s written request')
    expect(text).toContain('set it off against any other amount it owes the Sales Representative')
    expect(text).toContain('will not divert a lead or client to themselves or to another business')
    expect(text).toContain('The Sales Representative may do other work')
    expect(text).toContain('may end this agreement immediately, by written notice, if the Sales Representative materially breaches it')
    expect(text).toContain('urgent injunction to protect its confidential information and clients')
    expect(text).toContain('commission is calculated and paid in Israeli shekels (ILS)')
    expect(text).toContain('converted to ILS at the representative exchange rate published by the Bank of Israel on the day the Company receives that payment')
    expect(text).toContain('Commission is paid in ILS, only by bank transfer')
    expect(text).toContain('converted to ILS once, at the Bank of Israel representative rate on the day the client signs its agreement with the Company')
    expect(text).toContain('That ILS contract price is then fixed, whatever later happens to the exchange rate, and it is the price used for the bonus steps')
    expect(text).toContain('once the client has paid the whole contract price in the currency it was quoted in')
    expect(text).toContain('less third-party hosting fees, third-party tool and software fees, taxes and direct out-of-pocket expenses')
    expect(text).toContain('calculated on profit in the same way')
    expect(text).toContain('Payment is conditional on the Company receiving, for the amount paid, a valid tax invoice or a receipt issued by the Sales Representative’s business')
    expect(text).toContain('for 12 months after it ends, the Sales Representative will not, directly or indirectly, solicit any client or employee of the Company')
    expect(text).toContain('resolved exclusively by the competent courts of the Jerusalem District, Israel')
    expect(text).not.toContain('binding arbitration')
    expect(text).toContain('within 10 business days after the end of that month')
    expect(text).toContain('within 60 days of the transaction')
    expect(text).toContain('30 days’ written notice')
    expect(text).toContain('laws of Test Jurisdiction')
    for (const h of ['APPOINTMENT AND SCOPE', 'COMMISSION TRIGGER EVENT', 'COMMISSION RATE AND CALCULATION', 'PAYMENT SCHEDULE', 'CLAWBACKS AND REFUNDS', 'CONFIDENTIALITY, INTELLECTUAL PROPERTY, NON-SOLICITATION AND CONFLICTS', 'TERMINATION AND PENDING DEALS', 'GOVERNING LAW AND DISPUTE RESOLUTION']) expect(text).toContain(h)
    expect(text).not.toMatch(/\{\{|\[[A-Za-z ]+\]/)
        expect(text).not.toMatch(/Milestone|downpayment/i)
  })
  it('changes only the injected values and escapes them', () => {
    const t = agreementHtml({ ...data, name: '<b>X</b>', figures: { ...data.figures, threshold: 20000, basePercent: 25 } })
    expect(t).toContain('&lt;b&gt;X&lt;/b&gt;')
    expect(t).toContain('receives 25% of every payment the client pays')
    expect(t).toContain('if the contract price is above 20,000 ILS')
  })
  it('validates input', () => {
    expect(validate(data)).toBeNull()
    expect(validate({ ...data, terms: { ...TERMS, payoutDays: NaN } })).toMatch(/Payout days/)
    expect(validate({ ...data, terms: { ...TERMS, clawbackDays: 0 } })).toMatch(/clawback/)
    expect(validate({ ...data, terms: { ...TERMS, noticeDays: 1.5 } })).toMatch(/notice/)
    expect(validate({ ...data, terms: { ...TERMS, jurisdiction: ' ' } })).toMatch(/jurisdiction/)
    expect(validate({ ...data, terms: { ...TERMS, companyLegalName: '' } })).toMatch(/legal name/)
    expect(validate({ ...data, terms: { ...TERMS, companyIdNumber: '' } })).toMatch(/number/)
    expect(validate({ ...data, terms: { ...TERMS, companyTradingAs: '' } })).toBeNull()
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

import { companyIsComplete, termsFromCompany, type CompanySettings } from '@/lib/sales-contract-core'

describe('company details saved once', () => {
  const company: CompanySettings = { legalName: 'Test Person', tradingAs: 'Test Brand', idNumber: '123456789', address: '1 Test Street, Test City', jurisdiction: 'Israel', payoutDays: 5, clawbackDays: 60, noticeDays: 7 }
  it('fills the agreement terms from the saved company and only takes the representative address per agreement', () => {
    const t = termsFromCompany(company, '2 Rep Street')
    expect(t).toMatchObject({ companyLegalName: 'Test Person', companyTradingAs: 'Test Brand', companyIdNumber: '123456789', companyAddress: '1 Test Street, Test City', agentAddress: '2 Rep Street', jurisdiction: 'Israel', payoutDays: 5, clawbackDays: 60, noticeDays: 7 })
    expect(validate({ ...data, terms: t })).toBeNull()
  })
  it('knows when the one-time details are missing', () => {
    expect(companyIsComplete(company)).toBe(true)
    expect(companyIsComplete({ ...company, legalName: '' })).toBe(false)
    expect(companyIsComplete({ ...company, idNumber: '12' })).toBe(false)
    expect(companyIsComplete({ ...company, address: '' })).toBe(false)
  })
})

describe('the representative signs in the name of their registered business', () => {
  const base = { logo: '/igani-logo%202.png', reference: 'ABC12345', admin: { name: 'Gabriel', email: 'g@igani.co', signature: null, signedAt: null } }
  const strip = (h: string): string => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ')
  it('says so in the agreement, and tells the representative the details come at signing', () => {
    const t = strip(html(data, { ...base, status: 'pending', rep: { name: 'Ariel Tzadok', email: 'a@b.co', signature: null, signedAt: null } }))
    expect(t).toContain('signs this agreement in the name of their registered business')
    expect(t).toContain('duly registered under the law that applies to it')
    expect(t).toContain('adds their registered business name and registration number when signing')
  })
  it('puts the business name and registration number on the signed copy', () => {
    const t = strip(html(data, { ...base, status: 'signed', rep: { name: 'Ariel Tzadok', email: 'a@b.co', signature: null, signedAt: '1 Nov 2026', business: { name: 'Ariel Tzadok Ltd.', number: '515123456' } } }))
    expect(t).toContain('Business name Ariel Tzadok Ltd.')
    expect(t).toContain('Registration no. 515123456')
    expect(t).not.toContain('adds their registered business name')
  })
  it('escapes the business details', () => {
    const h = html(data, { ...base, status: 'signed', rep: { name: 'A', email: 'a@b.co', signature: null, signedAt: 'x', business: { name: '<script>x</script>', number: '1&2' } } })
    expect(h).not.toContain('<script>x')
    expect(h).toContain('&lt;script&gt;')
  })
})

import { sameName } from '@/lib/sales-contract-core'

describe('the company is never the representative', () => {
  it('spots the same name whatever the case or spacing', () => {
    expect(sameName('Jack Flanders', '  jack   FLANDERS ')).toBe(true)
    expect(sameName('Amitai David Hanson', 'Jack Flanders')).toBe(false)
    expect(sameName('', '')).toBe(false)
  })
})
