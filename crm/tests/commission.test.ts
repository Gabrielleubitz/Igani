import { describe, expect, it } from 'vitest'
import { bpsToPercent, commissionCut, formatBps, formatIls, percentToBps } from '../lib/commission'

describe('commission', () => {
  it('10% of a ₪10,000 win is ₪1,000', () => {
    expect(commissionCut(10_000, percentToBps('10') as number)).toBe(1000)
  })

  it('handles decimal rates and rounds to whole shekels', () => {
    expect(commissionCut(10_000, 750)).toBe(750) // 7.5%
    expect(commissionCut(15_001, 1000)).toBe(1500) // 1500.1 → 1500
    expect(commissionCut(15_005, 1000)).toBe(1501) // 1500.5 → 1501
    expect(commissionCut(1, 1250)).toBe(0)
  })

  it('has no cut without a rate or an amount', () => {
    expect(commissionCut(10_000, null)).toBeNull()
    expect(commissionCut(null, 1000)).toBeNull()
    expect(commissionCut(undefined, undefined)).toBeNull()
    expect(commissionCut(-5, 1000)).toBeNull()
  })

  it('reads what an admin types', () => {
    expect(percentToBps('10')).toBe(1000)
    expect(percentToBps(' 7.5 ')).toBe(750)
    expect(percentToBps('12,25')).toBe(1225)
    expect(percentToBps('10%')).toBe(1000)
    expect(percentToBps(0)).toBe(0)
    expect(percentToBps('100')).toBe(10000)
  })

  it('treats blank as "no commission" and rejects nonsense', () => {
    expect(percentToBps('')).toBeNull()
    expect(percentToBps('   ')).toBeNull()
    expect(percentToBps(null)).toBeNull()
    expect(percentToBps('101')).toBeUndefined()
    expect(percentToBps('-5')).toBeUndefined()
    expect(percentToBps('abc')).toBeUndefined()
    expect(percentToBps('7.555')).toBeUndefined()
  })

  it('shows rates and money the way people read them', () => {
    expect(bpsToPercent(1000)).toBe('10')
    expect(bpsToPercent(750)).toBe('7.5')
    expect(bpsToPercent(null)).toBe('')
    expect(formatBps(1000)).toBe('10%')
    expect(formatBps(750)).toBe('7.5%')
    expect(formatIls(1000)).toBe('₪1,000')
    expect(formatIls(1_250_000)).toBe('₪1,250,000')
  })
})
