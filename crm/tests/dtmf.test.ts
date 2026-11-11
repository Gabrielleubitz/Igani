import { describe, expect, it } from 'vitest'
import { dtmfPair } from '../components/dialer/dtmf'

describe('keypad tones', () => {
  it('gives every key its standard touch-tone pair', () => {
    expect(dtmfPair('1')).toEqual([697, 1209])
    expect(dtmfPair('5')).toEqual([770, 1336])
    expect(dtmfPair('9')).toEqual([852, 1477])
    expect(dtmfPair('*')).toEqual([941, 1209])
    expect(dtmfPair('0')).toEqual([941, 1336])
    expect(dtmfPair('#')).toEqual([941, 1477])
    expect(dtmfPair('+')).toEqual([941, 1336])
    expect(dtmfPair('a')).toBeNull()
  })
})
