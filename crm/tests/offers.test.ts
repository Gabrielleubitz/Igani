import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import { offerHref } from '@/components/offer/OfferPage'
import { visualOrder } from '@/lib/bidi'
import { offerSlugFromHost } from '@/lib/offer-host'
import { defaultSelection, formatPrice, normalizeSelection, parseModules, selectionTotal, slugProblem, slugify } from '@/lib/offer-modules'
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
