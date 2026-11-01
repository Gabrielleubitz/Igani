import { describe, expect, it } from 'vitest'
import { parseShekels } from '../lib/money'

describe('parseShekels', () => {
  it('reads plain numbers, thousands separators and the shekel sign', () => {
    expect(parseShekels('17000')).toEqual({ ok: true, value: 17000 })
    expect(parseShekels('17,000')).toEqual({ ok: true, value: 17000 })
    expect(parseShekels(' ₪ 17,000 ')).toEqual({ ok: true, value: 17000 })
  })
  it('rounds decimals to whole shekels instead of turning 17000.50 into 1,700,050', () => {
    expect(parseShekels('17000.50')).toEqual({ ok: true, value: 17001 })
    expect(parseShekels('17000.4')).toEqual({ ok: true, value: 17000 })
  })
  it('treats blank as "no price" and refuses nonsense', () => {
    expect(parseShekels('')).toEqual({ ok: true, value: null })
    expect(parseShekels('   ')).toEqual({ ok: true, value: null })
    for (const bad of ['abc', '-5', '12k', '1.2.3', '30%']) expect(parseShekels(bad).ok).toBe(false)
    expect(parseShekels('99999999999').ok).toBe(false)
  })
})
