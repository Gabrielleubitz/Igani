import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { offerHref } from '@/components/offer/OfferPage'
import { visualOrder } from '@/lib/bidi'
import { offerSlugFromHost } from '@/lib/offer-host'
import { defaultSelection, formatModulePrice, formatPrice, normalizeSelection, parseModules, recurringTotals, selectionTotal, slugProblem, slugify } from '@/lib/offer-modules'
import { buildSignedPdf } from '@/lib/offer-sign'

const MODULES = parseModules([
  { id: 'core', group: 'core', name: 'Core', price: 20000, required: false, included: false },
  { id: 'app', group: 'main', name: 'App', price: 30000, required: false, included: true },
  { id: 'kyc', group: 'addons', name: 'KYC', price: 11000, required: false, included: false },
])

describe('offer modules', () => {
  it('core modules are always required and included', () => {
    expect(MODULES[0]).toMatchObject({ required: true, included: true })
  })

  it('drops bad rows and duplicate ids, rounds prices', () => {
    const m = parseModules([{ id: 'a', name: 'A', price: 10.6 }, { id: 'a', name: 'dup', price: 1 }, { id: '', name: 'x', price: 1 }, { id: 'b', name: 'B', price: 'free' }, null])
    expect(m).toEqual([{ id: 'a', group: 'main', name: 'A', price: 11, required: false, included: false }])
  })

  it('the default package is required + recommended', () => {
    expect(defaultSelection(MODULES)).toEqual(['core', 'app'])
    expect(selectionTotal(MODULES, defaultSelection(MODULES))).toBe(50000)
  })

  it('a client can not remove required modules or add unknown ones', () => {
    expect(normalizeSelection(MODULES, ['kyc', 'hacked'])).toEqual(['core', 'kyc'])
    expect(selectionTotal(MODULES, [])).toBe(20000)
  })

  it('keeps recurring modules out of the one-time total', () => {
    const m = parseModules([
      { id: 'core', group: 'core', name: 'Core', price: 20000 },
      { id: 'hosting', group: 'core', name: 'Hosting', price: 250, period: 'month' },
      { id: 'licence', group: 'addons', name: 'Licence', price: 3000, period: 'year', included: true },
      { id: 'support', group: 'addons', name: 'Support', price: 1500, period: 'month' },
    ])
    const sel = defaultSelection(m)
    expect(selectionTotal(m, sel)).toBe(20000)
    expect(recurringTotals(m, sel, 100)).toEqual({ month: 350, year: 3000 })
    expect(recurringTotals(m, [...sel, 'support'])).toEqual({ month: 1750, year: 3000 })
    expect(formatModulePrice(m[1]!, 'ILS')).toBe('₪250 / month')
    expect(formatModulePrice(m[2]!, 'ILS', 'he')).toBe('₪3,000 לשנה')
    expect(parseModules([{ id: 'x', name: 'X', price: 1, period: 'weekly' }])[0]?.period).toBeUndefined()
  })

  it('formats prices', () => {
    expect(formatPrice(115000)).toBe('₪115,000')
    expect(formatPrice(2500, 'USD')).toBe('$2,500')
  })
})

describe('offer slugs and hosts', () => {
  it('validates slugs', () => {
    expect(slugProblem('honey')).toBeNull()
    expect(slugProblem('shilan-trade')).toBeNull()
    expect(slugProblem('-x')).not.toBeNull()
    expect(slugProblem('Honey')).not.toBeNull()
    expect(slugProblem('www')).not.toBeNull()
    expect(slugify('Honey & Co. Ltd')).toBe('honey-co-ltd')
  })

  it('reads the offer from the host', () => {
    expect(offerSlugFromHost('honey.app.igani.co')).toBe('honey')
    expect(offerSlugFromHost('HONEY.app.igani.co:443')).toBe('honey')
    expect(offerSlugFromHost('cryo.localhost:3100')).toBe('cryo')
    expect(offerSlugFromHost('app.igani.co')).toBeNull()
    expect(offerSlugFromHost('localhost:3100')).toBeNull()
    expect(offerSlugFromHost('a.b.app.igani.co')).toBeNull()
    expect(offerSlugFromHost('www.app.igani.co')).toBeNull()
    expect(offerSlugFromHost('honey.app.igani.co.evil.com')).toBeNull()
    expect(offerSlugFromHost('crm-git-x.vercel.app')).toBeNull()
  })

  it('keeps the language in links', () => {
    expect(offerHref('/o/x', '/screen/a?step=1', 'en')).toBe('/o/x/screen/a?step=1&lang=en')
    expect(offerHref('', '#screens', 'he')).toBe('?lang=he#screens')
    expect(offerHref('/o/x', '', 'he')).toBe('/o/x?lang=he')
  })
})

describe('signed PDF', () => {
  it('orders Hebrew for left-to-right PDF drawing', () => {
    expect(visualOrder('Signed by Dana')).toBe('Signed by Dana')
    expect(visualOrder('שלום')).toBe('םולש')
    expect(visualOrder('Name: דנה כהן')).toBe('Name: ןהכ הנד')
  })

  it('adds a signature page and keeps the original pages', async () => {
    const original = await PDFDocument.create()
    original.addPage()
    original.addPage()
    const contract = await original.save()
    // 1×1 transparent PNG
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
    const out = await buildSignedPdf({
      contract,
      offerTitle: 'מערכת הזמנות',
      clientName: 'דבש בע״מ',
      offerUrl: 'https://honey.app.igani.co',
      modules: [{ name: 'ליבה', price: '₪20,000' }],
      oneTimeTotal: '₪20,000',
      monthly: '₪2,500',
      signerName: 'דנה כהן',
      signerEmail: 'dana@example.com',
      signedAt: new Date('2026-11-05T10:00:00Z'),
      ip: '1.2.3.4',
      signaturePng: png,
    })
    const signed = await PDFDocument.load(out)
    expect(signed.getPageCount()).toBe(3)
  })
})

describe('offer access', () => {
  it('admins see every offer; nobody else while Offers is admin-only', async () => {
    const { OFFERS_FOR_SALES, canSeeOffer, offerScope } = await import('@/lib/offer-access')
    const o = { createdById: 'rep1', memberIds: ['rep2'] }
    expect(canSeeOffer({ id: 'boss', role: 'ADMIN' }, o)).toBe(true)
    expect(offerScope({ id: 'boss', role: 'ADMIN' })).toEqual({})
    if (!OFFERS_FOR_SALES) {
      expect(canSeeOffer({ id: 'rep1', role: 'SALES' }, o)).toBe(false)
      expect(offerScope({ id: 'rep1', role: 'SALES' })).toEqual({ id: { in: [] } })
    } else {
      expect(canSeeOffer({ id: 'rep1', role: 'SALES' }, o)).toBe(true) // creator
      expect(canSeeOffer({ id: 'rep2', role: 'SALES' }, o)).toBe(true) // invited
      expect(canSeeOffer({ id: 'rep3', role: 'SALES' }, o)).toBe(false) // neither
    }
    expect(canSeeOffer({ id: 'm', role: 'MARKETING' }, o)).toBe(false)
  })
})

describe('contract template safety', () => {
  it('drops anything that is not a real image data URL and escapes text', async () => {
    const { contractHtml } = await import('@/lib/contract-html')
    const html = contractHtml({
      lang: 'en',
      doc: { title: 'T <b>', intro: '"quoted" & <i>', sections: [{ heading: 'H', clauses: ['<img src=x onerror=alert(1)>'] }] },
      accent: 'red;}</style><script>x</script>',
      iganiLogo: 'javascript:alert(1)',
      clientLogo: null,
      igani: { name: 'Igani', signaturePng: 'data:image/png;base64,AAAA" onload="x', signedAt: null },
      client: { name: '<script>c</script>', signaturePng: 'data:image/png;base64,iVBORw0KGgo=', signedAt: null },
      fees: [],
      totals: { oneTime: '₪0', monthly: null, yearly: null },
      offerUrl: 'https://x',
      reference: 'R',
      date: new Date(),
      status: 'draft',
    })
    expect(html).not.toMatch(/<script>|<img src=x|onload=|javascript:|T <b>|<i>/) // user markup never becomes real tags
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;') // it is shown as text instead
    expect(html).toContain('T &lt;b&gt;')
    expect(html).toContain('data:image/png;base64,iVBORw0KGgo=') // the real signature stays
    expect(html).toContain('--accent:#2563eb') // bad accent replaced
  })
})
