import { describe, expect, it } from 'vitest'
import { aiUsageByMonth, fmtTokens, modelOfRequest, usageFromBody } from '../lib/ai-usage'
import { billsFromUsage, isoCountryOf, priceFor } from '../lib/twilio-costs'

describe('AI usage from OpenAI answers', () => {
  it('reads chat tokens, cached tokens and the model', () => {
    const u = usageFromBody({ model: 'gpt-5.5-2026', usage: { prompt_tokens: 1200, completion_tokens: 300, prompt_tokens_details: { cached_tokens: 200 } } }, 'gpt-5.5')
    expect(u).toEqual({ model: 'gpt-5.5-2026', inputTokens: 1200, outputTokens: 300, cachedTokens: 200, audioSeconds: 0 })
  })

  it('reads token-billed and minute-billed transcriptions', () => {
    expect(usageFromBody({ text: 'hi', usage: { type: 'tokens', input_tokens: 900, output_tokens: 40 } }, 'gpt-4o-transcribe')).toMatchObject({ model: 'gpt-4o-transcribe', inputTokens: 900, outputTokens: 40 })
    expect(usageFromBody({ text: 'hi', usage: { type: 'duration', seconds: 95 } }, 'whisper-1')).toMatchObject({ audioSeconds: 95 })
    // whisper-1 with verbose_json: only the audio length
    expect(usageFromBody({ text: 'hi', duration: 61.5, segments: [] }, 'whisper-1')).toMatchObject({ model: 'whisper-1', audioSeconds: 61.5 })
  })

  it('ignores answers with nothing to count', () => {
    expect(usageFromBody({ choices: [] }, 'gpt-5.5')).toBeNull()
    expect(usageFromBody(null, 'x')).toBeNull()
  })

  it('reads the model from a JSON body or a form', () => {
    expect(modelOfRequest(JSON.stringify({ model: 'gpt-5.5', messages: [] }))).toBe('gpt-5.5')
    const f = new FormData()
    f.append('model', 'whisper-1')
    expect(modelOfRequest(f)).toBe('whisper-1')
    expect(modelOfRequest('not json')).toBe('')
  })

  it('totals per month and feature, newest month first', () => {
    const months = aiUsageByMonth([
      { month: '2026-10', feature: 'call-review', inputTokens: 1000, outputTokens: 200, audioSeconds: 0 },
      { month: '2026-11', feature: 'call-review', inputTokens: 500, outputTokens: 100, audioSeconds: 0 },
      { month: '2026-11', feature: 'transcription', inputTokens: 0, outputTokens: 0, audioSeconds: 120 },
      { month: '2026-11', feature: 'call-review', inputTokens: 700, outputTokens: 50, audioSeconds: 0 },
    ])
    expect(months.map((m) => m.month)).toEqual(['2026-11', '2026-10'])
    const nov = months[0]!
    expect(nov.requests).toBe(3)
    expect(nov.tokens).toBe(1350)
    expect(nov.audioMinutes).toBe(2)
    expect(nov.rows[0]).toMatchObject({ feature: 'call-review', label: 'Call reviews', requests: 2, inputTokens: 1200, outputTokens: 150 })
  })

  it('formats token counts', () => {
    expect(fmtTokens(950)).toBe('950')
    expect(fmtTokens(12_400)).toBe('12k')
    expect(fmtTokens(3_400)).toBe('3.4k')
    expect(fmtTokens(3_100_000)).toBe('3.1M')
  })
})

describe('Twilio bill and number prices', () => {
  it('adds up the top-level categories per month and puts the rest under Other', () => {
    const bills = billsFromUsage([
      { category: 'totalprice', startDate: '2026-11-01', price: '41.50' },
      { category: 'phonenumbers', startDate: '2026-11-01', price: '6.00', count: '2' },
      { category: 'calls', startDate: '2026-11-01', price: '30.25', usage: '180' },
      { category: 'recordings', startDate: '2026-11-01', price: '1.00' },
      { category: 'recordingstorage', startDate: '2026-11-01', price: '0.25' },
      { category: 'sms', startDate: '2026-11-01', price: '2.00', count: '40' },
      { category: 'totalprice', startDate: '2026-10-01', price: 3 },
      { category: 'phonenumbers', startDate: '2026-10-01', price: 3, count: 1 },
      { category: 'totalprice', startDate: '2026-09-01', price: 0 },
    ])
    expect(bills.map((b) => b.month)).toEqual(['2026-11', '2026-10'])
    expect(bills[0]).toMatchObject({ numbers: 6, numberCount: 2, calls: 30.25, callMinutes: 180, recordings: 1.25, texts: 2, textCount: 40, total: 41.5 })
    expect(bills[0]!.other).toBeCloseTo(2)
    expect(bills[1]).toMatchObject({ numbers: 3, other: 0, total: 3 })
  })

  it('never shows a total below its parts', () => {
    const [b] = billsFromUsage([{ category: 'calls', startDate: '2026-11-01', price: 5, usage: 10 }])
    expect(b).toMatchObject({ total: 5, other: 0 })
  })

  it('finds the country and the price for the number type', () => {
    expect(isoCountryOf('+972533001122')).toBe('IL')
    expect(isoCountryOf('+12125550100')).toBe('US')
    expect(isoCountryOf('+33123456789')).toBeNull()
    const prices = [
      { numberType: 'local', basePrice: 3, currentPrice: 3 },
      { numberType: 'mobile', basePrice: 6, currentPrice: 5.5 },
      { numberType: 'toll free', basePrice: 15 },
    ]
    expect(priceFor('mobile', prices)).toBe(5.5)
    expect(priceFor('toll free', prices)).toBe(15)
    expect(priceFor('unknown', prices)).toBe(3)
    expect(priceFor('mobile', [{ numberType: 'local', currentPrice: 1 }])).toBeNull()
  })
})
