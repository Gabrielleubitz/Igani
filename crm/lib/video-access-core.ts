/** The decision behind "may this person play this video right now". Pure (no database): the stream route and the link route share it. */
import { needsAck } from './video-ack-core'
import { canWatch, type OfferRef, type VideoRecord, type Viewer } from './video-core'

export type VideoAccess = 'ok' | 'deny' | 'confirmation_required'

/** `acked` is whether they confirmed the confidentiality notice recently (only asked of people who need it). */
export function decideAccess(i: { video: VideoRecord; viewer: Viewer; offer: OfferRef; acked: boolean }): VideoAccess {
  if (!canWatch(i.video, i.viewer, i.offer)) return 'deny'
  if (i.viewer && needsAck(i.viewer.role, i.video.visibility) && !i.acked) return 'confirmation_required'
  return 'ok'
}

/** How long a direct play link lives. Long enough for a lesson, short enough that a shared link goes stale. */
export const PLAY_LINK_SECONDS = 30 * 60
