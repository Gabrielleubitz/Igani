import { describe, expect, it } from 'vitest'
import { dialProblem, formatAsTyped, formatPhone, normalizePhone, toE164 } from '@/lib/phone-numbers'

describe('phone numbers', () => {
  it('normalises what people type and paste', () => {
    expect(normalizePhone('050-123-4567')).toBe('+972501234567')
    expect(normalizePhone('+972 50 123 4567')).toBe('+972501234567')
    expect(normalizePhone('+972 (0)50 123 4567'.replace('(0)', '0'))).toBe('+972501234567')
    expect(normalizePhone('00972501234567')).toBe('+972501234567')
    expect(normalizePhone('03-123-4567')).toBe('+97231234567')
    expect(normalizePhone('+1 (212) 555-0100')).toBe('+12125550100')
    expect(normalizePhone('1 212 555 0100')).toBe('+12125550100')
    expect(normalizePhone('212 555 0100', 'US')).toBe('+12125550100')
    expect(normalizePhone('hello')).toBeNull()
    expect(normalizePhone('123')).toBeNull()
  })

  it('reads stored numbers either way: Israeli first, then US', () => {
    expect(toE164('570-290-1979')).toBe('+15702901979')
    expect(toE164('050-123-4567')).toBe('+972501234567')
    expect(toE164('+972 53 231 5090')).toBe('+972532315090')
  })

  it('only dials allowed countries, never premium numbers', () => {
    const both = ['IL', 'US'] as const
    expect(dialProblem('+972501234567', both)).toBeNull()
    expect(dialProblem('+12125550100', both)).toBeNull()
    expect(dialProblem('+12125550100', ['IL'])).toMatch(/aren’t enabled/)
    expect(dialProblem('+447911123456', both)).toMatch(/aren’t enabled/)
    expect(dialProblem('+19005551234', both)).toMatch(/Premium/)
    expect(dialProblem('+97219001234', both)).toMatch(/Premium/)
    expect(dialProblem('+9725012', both)).toMatch(/wrong length/)
    expect(dialProblem(null, both)).toMatch(/phone number/)
  })

  it('formats for display', () => {
    expect(formatPhone('+972501234567')).toBe('+972 50-123-4567')
    expect(formatPhone('+97231234567')).toBe('+972 3-123-4567')
    expect(formatPhone('+12125550100')).toBe('+1 (212) 555-0100')
    expect(formatAsTyped('0501234567')).toBe('050-123-4567')
    expect(formatAsTyped('+97250')).toBe('+97250')
  })
})
