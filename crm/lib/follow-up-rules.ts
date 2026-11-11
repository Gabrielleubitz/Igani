/**
 * When a conversation needs a follow-up, and on which channel. Pure (no database), so it's easy to test and tune.
 */

export type FollowUpKind = 'unanswered' | 'promise' | 'quiet'

const DAY = 86_400_000

/** Stages where a deal is still moving and silence costs something. */
const ACTIVE = new Set(['NEW', 'CONTACTED', 'INTERESTED', 'CALL_BACK', 'VOICEMAIL', 'NO_ANSWER', 'BUSY', 'DEMO_SCHEDULED', 'DEMO_SENT', 'PROPOSAL_SENT', 'SIGNED'])

export interface FollowUpSignals {
  status: string
  /** the client's last message or answered call to us, and ours to them */
  lastIn: Date | null
  lastOut: Date | null
  /** open action items from calls (owner rep = we promised, client = they promised) */
  openItems: { text: string; owner: 'rep' | 'client'; at: Date }[]
  lastInKind: string | null
}

const fmt = (d: Date): string => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'short' }).format(d)
const clip = (s: string, n = 90): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/**
 * Why a follow-up is due now, or null. In order:
 * 1. unanswered: the client got in touch last and hasn't heard back for a day or more;
 * 2. promise: we promised something on a call and it's been 2+ days with no word from us since;
 * 3. quiet: we spoke last, the deal is still active, and it's been 4+ days without a reply.
 * Conversations quiet for over 45 days are left alone (too cold for an automatic nudge).
 */
export function followUpReason(s: FollowUpSignals, now = new Date()): { kind: FollowUpKind; text: string } | null {
  if (!ACTIVE.has(s.status)) return null
  const last = Math.max(s.lastIn?.getTime() ?? 0, s.lastOut?.getTime() ?? 0)
  if (!last || now.getTime() - last > 45 * DAY) return null
  const since = (d: Date): number => (now.getTime() - d.getTime()) / DAY

  if (s.lastIn && (!s.lastOut || s.lastIn > s.lastOut) && since(s.lastIn) >= 1) {
    const via = s.lastInKind === 'email' ? 'emailed' : s.lastInKind === 'sms' ? 'texted' : s.lastInKind === 'call' ? 'called' : 'got in touch'
    return { kind: 'unanswered', text: `They ${via} on ${fmt(s.lastIn)} and haven't heard back.` }
  }
  const ours = s.openItems.filter((i) => i.owner === 'rep' && (!s.lastOut || i.at.getTime() >= s.lastOut.getTime() - 6 * 3_600_000))
  if (ours.length && since(new Date(last)) >= 2) {
    return { kind: 'promise', text: `You said you'd ${clip(ours[0]!.text.replace(/^(i|we)( will|'ll)?\s+/i, ''))} (${fmt(ours[0]!.at)}), and nothing has gone out since.` }
  }
  if (s.lastOut && (!s.lastIn || s.lastOut >= s.lastIn) && since(s.lastOut) >= 4) {
    const theirs = s.openItems.find((i) => i.owner === 'client')
    return { kind: 'quiet', text: theirs ? `No reply since ${fmt(s.lastOut)}. They were going to ${clip(theirs.text)}.` : `No reply since ${fmt(s.lastOut)}.` }
  }
  return null
}

/** Answer on the channel they last used with us when we can; otherwise the one we used; email before text. */
export function pickChannel(c: { email: string | null; phone: string | null; lastInKind: string | null; lastOutKind: string | null }): 'email' | 'sms' | null {
  const can = (ch: 'email' | 'sms'): boolean => (ch === 'email' ? Boolean(c.email) : Boolean(c.phone))
  for (const k of [c.lastInKind, c.lastOutKind]) {
    if ((k === 'email' || k === 'sms') && can(k)) return k
  }
  if (c.email) return 'email'
  if (c.phone) return 'sms'
  return null
}
