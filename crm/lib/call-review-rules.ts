/**
 * Which calls get an automatic AI review. Reviews cost money, so only connected calls of two minutes or more are reviewed on their own.
 * Pure (no server imports) so the call page, the actions and the tests share it.
 */

export const MIN_REVIEW_SECONDS = 120

/** What the salesman sees on a call that was not reviewed because it was too short. */
export const SHORT_CALL_MESSAGE = 'Not reviewed: this call was under 2 minutes. An admin can review it manually.'

/** True when a call is too short for an automatic review. A call whose length is unknown is not treated as short. */
export const tooShortToReview = (seconds: number | null | undefined): boolean => seconds != null && seconds < MIN_REVIEW_SECONDS

/** The length to judge by: the recording's, or else the talk time. */
export const callLength = (c: { recordingSec: number | null; durationSec: number | null }): number | null => c.recordingSec ?? c.durationSec

/** Admins may review any call by hand; everyone else only calls long enough for an automatic review. */
export const mayReviewByHand = (role: 'ADMIN' | 'SALES' | 'MARKETING' | string, seconds: number | null | undefined): boolean => role === 'ADMIN' || !tooShortToReview(seconds)

/** What the salesman sees on a call that never connected (nobody to review). */
export const NOT_CONNECTED_MESSAGE = 'Not reviewed: the call did not connect.'

/** True when nobody picked up: no answer time and no talk time. Such a call has nothing to review, even by hand. */
export const notConnected = (c: { answeredAt: Date | null; durationSec: number | null; recordingSec?: number | null }): boolean =>
  c.answeredAt == null && (c.durationSec ?? 0) <= 0 && (c.recordingSec ?? 0) <= 0
