import { describe, expect, it } from 'vitest'
import { phonePattern, samePhone, splitE164 } from '@/lib/phone-match'

describe('phone matching', () => {
  it('treats every usual way of writing a number as the same number', () => {
    for (const v of ['+972 2-123-4567', '02-1234567', '00972 2 123 4567', '+972 0 2 1234567', '21234567', '972-2-1234567']) expect(samePhone('02-123-4567', v)).toBe(true)
    for (const v of ['+972 50-123-4567', '0501234567', '00972501234567', '501234567']) expect(samePhone('050-123-4567', v)).toBe(true)
    expect(samePhone('(212) 555-0100', '+1 212 555 0100')).toBe(true)
    expect(samePhone('+1 212 555 0100', '1-212-555-0100')).toBe(true)
    expect(samePhone('+1 212 555 0100', '212.555.0100')).toBe(true)
  })

  it('never matches different numbers that share trailing digits', () => {
    expect(samePhone('02-1234567', '052-1234567')).toBe(false) // landline vs mobile, same last 7
    expect(samePhone('052-1234567', '072-1234567')).toBe(false) // same last 8
    expect(samePhone('052-1234567', '052-1234568')).toBe(false)
    expect(samePhone('052-1234567', '+1 952 123 4567')).toBe(false)
  })

  it('splits and builds patterns only for phone numbers', () => {
    expect(splitE164('+97221234567')).toEqual({ cc: '972', national: '21234567' })
    expect(splitE164('+12125550100')).toEqual({ cc: '1', national: '2125550100' })
    expect(phonePattern('hello')).toBeNull()
    expect(phonePattern(null)).toBeNull()
    expect(samePhone('nope', 'nope')).toBe(false)
  })
})
