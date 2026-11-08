import { describe, expect, it } from 'vitest'
import { RATES, costOf, costsByMonth, outboundRate, rateUsd, usd, type CostCall } from '../lib/call-costs'
import { callLength, mayReviewByHand, MIN_REVIEW_SECONDS, SHORT_CALL_MESSAGE, tooShortToReview } from '../lib/call-review-rules'

const call = (o: Partial<CostCall>): CostCall => ({ userId: 'u1', userName: 'Ann', month: '2026-11', direction: 'OUTBOUND', otherNumber: '+972501234567', durationSec: 200, recordingSec: 200, analysisStatus: 'ready', ...o })

describe('review only calls over a minute', () => {
  it('treats under 60 seconds as short, and an unknown length as not short', () => {
    expect(MIN_REVIEW_SECONDS).toBe(60)
    expect(tooShortToReview(59)).toBe(true)
    expect(tooShortToReview(60)).toBe(false)
    expect(tooShortToReview(null)).toBe(false)
    expect(SHORT_CALL_MESSAGE).toContain('under 60 seconds')
    expect(SHORT_CALL_MESSAGE).toContain('An admin can review it manually')
  })
  it('judges by the recording length, or else the talk time', () => {
    expect(callLength({ recordingSec: 40, durationSec: 90 })).toBe(40)
    expect(callLength({ recordingSec: null, durationSec: 45 })).toBe(45)
    expect(callLength({ recordingSec: null, durationSec: null })).toBeNull()
  })
  it('lets only an admin review a short call by hand', () => {
    expect(mayReviewByHand('ADMIN', 20)).toBe(true)
    expect(mayReviewByHand('SALES', 20)).toBe(false)
    expect(mayReviewByHand('SALES', 120)).toBe(true)
    expect(mayReviewByHand('SALES', null)).toBe(true)
  })
})

describe('monthly cost estimate', () => {
  it('prices the number dialled', () => {
    expect(outboundRate('+972 50 123 4567')).toBe(RATES.ilMobile)
    expect(outboundRate('+97239876543')).toBe(RATES.ilOther)
    expect(outboundRate('+15705550123')).toBe(RATES.us)
    expect(outboundRate('+4420123456')).toBe(RATES.otherCountry)
  })
  it('rounds each answered call up to whole minutes, and charges nothing for an unanswered one', () => {
    const answered = costOf(call({ durationSec: 61, recordingSec: 61, analysisStatus: null }), false)
    expect(answered.minutes).toBe(2)
    expect(answered.phone).toBeCloseTo(2 * (RATES.ilMobile + RATES.browserLeg), 6)
    expect(answered.ai).toBe(0)
    const missed = costOf(call({ durationSec: null, recordingSec: null, analysisStatus: null }), true)
    expect(missed).toMatchObject({ answered: false, minutes: 0, phone: 0, recording: 0, ai: 0 })
  })
  it('adds the review cost only for reviewed calls, and live hints only when they are on', () => {
    const reviewed = costOf(call({ durationSec: 180, recordingSec: 180 }), false)
    expect(reviewed.ai).toBeCloseTo(3 * RATES.transcription + RATES.reviewPerCall, 6)
    expect(costOf(call({ durationSec: 180, recordingSec: 180, analysisStatus: 'skipped' }), false).ai).toBe(0)
    expect(costOf(call({ durationSec: 180, recordingSec: 180, analysisStatus: 'skipped' }), true).ai).toBeCloseTo(3 * RATES.liveHintsPerMinute, 6)
  })
  it('totals per month, newest first, with a split per person', () => {
    const months = costsByMonth(
      [call({}), call({ userId: 'u2', userName: 'Bo', otherNumber: '+15705550123', durationSec: 60, recordingSec: 60, analysisStatus: null }), call({ month: '2026-10' }), call({ durationSec: null, recordingSec: null, analysisStatus: null })],
      false,
    )
    expect(months.map((m) => m.month)).toEqual(['2026-11', '2026-10'])
    const nov = months[0]!
    expect(nov.all.dials).toBe(3)
    expect(nov.all.answered).toBe(2)
    expect(nov.perPerson.map((p) => p.name)).toEqual(['Ann', 'Bo'])
    expect(nov.all.total).toBeCloseTo(nov.perPerson.reduce((n, p) => n + p.row.total, 0), 6)
    expect(costsByMonth([], true)).toEqual([])
  })
  it('formats money', () => {
    expect(usd(4.5)).toBe('$4.50')
    expect(usd(234.6)).toBe('$235')
    expect(rateUsd(0.0025)).toBe('$0.0025')
    expect(rateUsd(0.1868)).toBe('$0.1868')
    expect(rateUsd(0.1)).toBe('$0.10')
  })
})
