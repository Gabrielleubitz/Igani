/**
 * Which calls get an automatic AI review. Reviews cost money, so only calls of a minute or more are reviewed on their own.
 * Pure (no server imports) so the call page, the actions and the tests share it.
 */

export const MIN_REVIEW_SECONDS = 60

/** What the salesman sees on a call that was not reviewed because it was too short. */
export const SHORT_CALL_MESSAGE = 'Not reviewed: this call was under 60 seconds. An admin can review it manually.'

/** True when a call is too short for an automatic review. A call whose length is unknown is not treated as short. */
export const tooShortToReview = (seconds: number | null | undefined): boolean => seconds != null && seconds < MIN_REVIEW_SECONDS

/** The length to judge by: the recording's, or else the talk time. */
export const callLength = (c: { recordingSec: number | null; durationSec: number | null }): number | null => c.recordingSec ?? c.durationSec

/** Admins may review any call by hand; everyone else only calls long enough for an automatic review. */
export const mayReviewByHand = (role: 'ADMIN' | 'SALES' | 'MARKETING' | string, seconds: number | null | undefined): boolean => role === 'ADMIN' || !tooShortToReview(seconds)
