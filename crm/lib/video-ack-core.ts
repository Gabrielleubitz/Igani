/**
 * The confidentiality confirmation before an internal training video. Pure rules (no database), so they can be unit-tested.
 * A confirmation lets that person play that one video for a few hours (enough to watch it, pause, and come back).
 */

export const ACK_WINDOW_MS = 3 * 60 * 60 * 1000

export const ACK_TEXT = {
  title: 'Confidential',
  body: 'This video is Igani’s private training material. I confirm I will not download, record, copy or share it, or what it shows, with anyone outside Igani.',
  button: 'I confirm and start the video',
}

/** Admins are not asked. Everyone else watching an internal ('team') video must have confirmed. Offer videos are for customers and are never gated. */
export function needsAck(role: 'ADMIN' | 'SALES' | 'MARKETING' | null | undefined, visibility: 'team' | 'offer'): boolean {
  return visibility === 'team' && (role === 'SALES' || role === 'MARKETING')
}

/** True when the latest confirmation is recent enough. */
export function ackIsValid(lastAckAt: Date | null | undefined, now: Date = new Date()): boolean {
  if (!lastAckAt) return false
  const age = now.getTime() - lastAckAt.getTime()
  return age >= 0 && age <= ACK_WINDOW_MS
}
