import { describe, expect, it } from 'vitest'
import { SETTING_DEFAULTS, SETTING_SCHEMAS, isSettingKey } from '@/lib/settings'

describe('settings schema', () => {
  it('defaults satisfy their own schemas', () => {
    for (const k of Object.keys(SETTING_SCHEMAS) as (keyof typeof SETTING_SCHEMAS)[]) {
      expect(SETTING_SCHEMAS[k].safeParse(SETTING_DEFAULTS[k]).success).toBe(true)
    }
  })
  it('rejects unknown keys and bad values', () => {
    expect(isSettingKey('evil')).toBe(false)
    expect(SETTING_SCHEMAS['booking.bufferMinutes'].safeParse(-1).success).toBe(false)
    expect(SETTING_SCHEMAS['notifications.emails'].safeParse(['nope']).success).toBe(false)
  })
})
