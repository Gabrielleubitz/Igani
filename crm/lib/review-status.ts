import { NOT_CONNECTED_MESSAGE, SHORT_CALL_MESSAGE, callLength, notConnected, tooShortToReview } from '@/lib/call-review-rules'

/**
 * Where a call's review stands, described for the rep. Pure: nothing here starts, retries or changes an analysis (the
 * existing hourly retry and "Analyze again" run exactly as before).
 *
 *  - failed       the analysis explicitly failed (`willRetry` says whether an automatic retry is still to come)
 *  - unavailable  nothing has appeared yet and the waiting window is over; it may still arrive
 *  - waiting      nothing yet, still inside the waiting window
 *  - skipped      the review was not made for a stated reason (too short, nothing said …)
 *  - ready        the review exists and can be read
 *  - none         no review is expected, or it isn't the viewer's call
 */
export type ReviewStateName = 'none' | 'skipped' | 'waiting' | 'unavailable' | 'failed' | 'ready'

/** After this long without a review the card says it is taking longer than usual (wording only, never a failure). */
export const WAIT_MS = 60 * 60_000
/** The existing retry limit (lib/call-analysis.ts). */
export const MAX_ATTEMPTS = 3

export interface ReviewCall {
  userId: string | null
  private: boolean
  simulated: boolean
  startedAt: Date
  endedAt: Date | null
  answeredAt: Date | null
  durationSec: number | null
  recordingSec: number | null
  recordingStatus: string | null
  analysisStatus: string | null
  analysisError: string | null
  analysisAttempts: number
}

export interface ReviewState {
  state: ReviewStateName
  /** failed only: an automatic retry is still to come */
  willRetry?: boolean
  /** the honest line for the rep (not set for ready / waiting without something to add) */
  message?: string
}

const NONE: ReviewState = { state: 'none' }

/**
 * `viewerId` must be the call's own rep: a call that isn't the viewer's (including an admin looking at someone else's
 * call) is `none`, so nothing about it is revealed. `readable` says whether the stored analysis parses.
 */
export function reviewState(call: ReviewCall, viewerId: string, now: Date, readable: boolean): ReviewState {
  if (!call.userId || call.userId !== viewerId || call.private || call.simulated) return NONE
  if (call.recordingStatus === 'absent') return { state: 'none', message: 'No recording was made for this call, so there is nothing to review.' }
  if (notConnected(call)) return { state: 'none', message: NOT_CONNECTED_MESSAGE }

  const st = call.analysisStatus
  if (st === 'ready') {
    return readable ? { state: 'ready' } : { state: 'failed', willRetry: true, message: 'We couldn’t read this review. Open the call to try again.' }
  }
  if (st === 'skipped') return { state: 'skipped', message: call.analysisError ?? SHORT_CALL_MESSAGE }
  if (st === 'failed') {
    const willRetry = call.analysisAttempts < MAX_ATTEMPTS
    return {
      state: 'failed',
      willRetry,
      message: willRetry ? 'We hit a problem reviewing this call and will try again automatically.' : `We couldn’t complete the review of this call.${call.analysisError ? ` ${call.analysisError}` : ''}`,
    }
  }
  // not started yet (null), queued (pending) or running (processing)
  if (st !== 'processing' && tooShortToReview(callLength(call))) return { state: 'skipped', message: SHORT_CALL_MESSAGE }
  const ended = call.endedAt ?? (call.durationSec != null ? new Date(call.startedAt.getTime() + call.durationSec * 1000) : call.startedAt)
  const age = Math.max(0, now.getTime() - ended.getTime())
  return age < WAIT_MS
    ? { state: 'waiting' }
    : { state: 'unavailable', message: 'Your review isn’t ready yet. It’s taking longer than usual and may still arrive.' }
}
