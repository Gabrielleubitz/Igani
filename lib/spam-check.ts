/**
 * Fake sign-up detection for website forms (and the CRM's lead API). Pure functions, no network.
 * Kept identical in the website (lib/spam-check.ts) and the CRM (crm/lib/spam-check.ts).
 *
 * Signals, strongest first:
 *  - honeypot: a hidden field people never see but form-filling bots fill in
 *  - too fast: the form was sent within a couple of seconds of opening (no person types that fast)
 *  - Gmail dot trick: Gmail ignores dots, so bots spray "u.j.e.s.uy.ov.e.j.96.1@gmail.com" to look like new people
 *  - throwaway email domains
 *  - keyboard-mash names / companies ("Cprf Fxivwxq", "Yoyhdabg LLC")
 * One strong signal blocks; weak ones only block together, so real people with unusual names get through.
 */

export interface SpamInput {
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  company?: string | null
  message?: string | null
  /** hidden honeypot field; anything in it means a bot */
  honeypot?: string | null
  /** milliseconds between the form opening and submit, when the form sends it */
  elapsedMs?: number | null
}

export interface SpamVerdict {
  spam: boolean
  score: number
  reasons: string[]
}

const DISPOSABLE = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'sharklasers.com', '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'yopmail.com',
  'trashmail.com', 'getnada.com', 'dispostable.com', 'maildrop.cc', 'mintemail.com', 'throwawaymail.com', 'fakeinbox.com', 'mohmal.com', 'emailondeck.com',
  'tempmailo.com', 'tempr.email', 'discard.email', 'spamgourmet.com', 'mailnesia.com', 'mytemp.email', 'burnermail.io', 'inboxkitten.com',
])
const GMAIL = new Set(['gmail.com', 'googlemail.com'])

/** Gmail address padded with dots to look unique: 3+ dots, or several single-letter pieces ("u.j.e.s"). */
export function gmailDotTrick(email: string): boolean {
  const [local = '', domain = ''] = email.toLowerCase().trim().split('@')
  if (!GMAIL.has(domain)) return false
  const parts = local.split('+')[0]!.split('.')
  const dots = parts.length - 1
  const singles = parts.filter((p) => p.length === 1).length
  return dots >= 3 || singles >= 2
}

const VOWELS = /[aeiouy]/i

/**
 * A Latin word that reads like random letters: long consonant runs, almost no vowels, or a mash like "Fxivwxq".
 * Words in other scripts (Hebrew, Arabic, Russian…) are never judged.
 */
export function gibberishWord(word: string): boolean {
  const w = word.replace(/[^A-Za-z]/g, '')
  if (w.length < 4 || w.length !== word.replace(/[\s.'-]/g, '').length) return false
  const lower = w.toLowerCase()
  const vowels = (lower.match(/[aeiouy]/g) ?? []).length
  if (!VOWELS.test(lower)) return true // "Cprf", "Bcdfg"
  if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(lower)) return true // 5 consonants in a row
  if (w.length >= 6 && vowels / w.length < 0.15) return true // "Fxivwxq" (1 vowel in 7), but not "Rhythm" (1 in 6)
  // rare letter pairs real names almost never have
  const rare = (lower.match(/(xq|qx|vw|wx|xv|fx|xf|qz|zq|jx|xj|vq|qv|wq|qw|zx|xz|kq|qk|gx|xg|cx|xc|pq|qp|yh|hd|bg|gb|db|dg|gd|vb|bv|fg|gf|hg|hb|tq|qt)/g) ?? []).length
  return rare >= 2
}

/** How many words of a phrase look like keyboard mash, out of the Latin words long enough to judge. */
function mashRatio(text: string): { mash: number; judged: number } {
  const words = text.split(/\s+/).filter((x) => /^[A-Za-z][A-Za-z'.-]{3,}$/.test(x) && !/^(llc|ltd|inc|corp|group|studio|page|landing)$/i.test(x))
  return { mash: words.filter(gibberishWord).length, judged: words.length }
}

export function checkSubmission(input: SpamInput): SpamVerdict {
  const reasons: string[] = []
  let score = 0
  const email = (input.email ?? '').trim().toLowerCase()
  const domain = email.split('@')[1] ?? ''

  if (input.honeypot && input.honeypot.trim()) {
    score += 10
    reasons.push('honeypot filled')
  }
  if (typeof input.elapsedMs === 'number' && input.elapsedMs >= 0 && input.elapsedMs < 2500) {
    score += 6
    reasons.push(`sent ${Math.round(input.elapsedMs)} ms after opening`)
  }
  if (email && gmailDotTrick(email)) {
    score += 6
    reasons.push('Gmail address padded with dots')
  }
  if (domain && DISPOSABLE.has(domain)) {
    score += 6
    reasons.push('throwaway email domain')
  }
  const name = [input.name, input.firstName, input.lastName].filter(Boolean).join(' ').trim()
  const n = mashRatio(name)
  if (n.judged && n.mash === n.judged) {
    score += 4
    reasons.push('name looks like random letters')
  } else if (n.mash) {
    score += 2
    reasons.push('part of the name looks like random letters')
  }
  const extra = mashRatio([input.company, (input.message ?? '').slice(0, 200)].filter(Boolean).join(' '))
  if (extra.mash >= 1 && extra.mash >= extra.judged / 2) {
    score += 2
    reasons.push('company or message looks like random letters')
  }
  // 6+ blocks: one strong signal, or a random-letters name together with any other sign
  return { spam: score >= 6, score, reasons }
}
