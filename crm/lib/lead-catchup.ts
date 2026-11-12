import type { TimelineItem } from '@/lib/lead-timeline'

/** What the lead page's Catch-up tab works out from data we already store. Pure, no AI and no database. */

export interface CallRead {
  /** newest first */
  sentiment: 'positive' | 'neutral' | 'negative' | null
  summary: string | null
  nextStep: string | null
  objections: string[]
  at: string
}

export interface Sentiment {
  label: 'Receptive' | 'Neutral' | 'Cooling'
  /** 0 (cooling) to 1 (receptive) */
  score: number
  /** how many calls it is based on */
  calls: number
}

/** The mood of the last analysed calls; the newest counts most. null when no call was analysed. */
export function sentimentFrom(reads: CallRead[]): Sentiment | null {
  const rated = reads.filter((r) => r.sentiment !== null).slice(0, 5)
  if (!rated.length) return null
  const val = { positive: 1, neutral: 0.5, negative: 0 } as const
  let sum = 0
  let weight = 0
  rated.forEach((r, i) => {
    const w = rated.length - i
    sum += val[r.sentiment!] * w
    weight += w
  })
  const score = sum / weight
  return { label: score >= 0.65 ? 'Receptive' : score <= 0.35 ? 'Cooling' : 'Neutral', score, calls: rated.length }
}

/** What stands in the way: the pains from the lead profile, then the objections raised on calls. No repeats. */
export function challengesFrom(pains: string[], reads: CallRead[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of [...pains, ...reads.flatMap((r) => r.objections)]) {
    const text = t.trim()
    const key = text.toLowerCase()
    if (!text || seen.has(key)) continue
    seen.add(key)
    out.push(text)
  }
  return out.slice(0, 6)
}

const DAY = 86_400_000
const ago = (iso: string, now: Date): string => {
  const d = Math.floor((now.getTime() - new Date(iso).getTime()) / DAY)
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`
}

/** The last few things in each direction (emails, texts, calls), and a one-line status saying who spoke last. */
export function interactionSplit(items: TimelineItem[], now: Date): { inbound: TimelineItem[]; outbound: TimelineItem[]; status: string } {
  const real = items.filter((i) => i.group === 'past' && (i.kind === 'email' || i.kind === 'sms' || i.kind === 'call'))
  const inbound = real.filter((i) => i.dir === 'in').slice(0, 3)
  const outbound = real.filter((i) => i.dir === 'out').slice(0, 3)
  const lastIn = inbound[0]
  const lastOut = outbound[0]
  let status = 'No emails, texts or calls with this contact yet.'
  if (lastIn && lastOut) status = `They last reached us ${ago(lastIn.at, now)}; we last reached them ${ago(lastOut.at, now)}.${new Date(lastIn.at) > new Date(lastOut.at) ? ' They are waiting for us.' : ''}`
  else if (lastOut) status = `We last reached them ${ago(lastOut.at, now)}. They haven’t reached out yet.`
  else if (lastIn) status = `They last reached us ${ago(lastIn.at, now)}. We haven’t answered yet.`
  return { inbound, outbound, status }
}

/** The "Contact insights" bullets: where things stand, from the latest call and what's coming up. */
export function insightBullets(input: { reads: CallRead[]; nextTask: { title: string; due: string | null } | null; nextMeeting: { title: string; when: string } | null; profileNeeds: string[] }): { label: string; text: string }[] {
  const out: { label: string; text: string }[] = []
  const last = input.reads.find((r) => r.summary)
  if (last?.summary) out.push({ label: 'Latest call', text: last.summary })
  if (last?.nextStep) out.push({ label: 'Next step agreed', text: last.nextStep })
  if (input.profileNeeds.length) out.push({ label: 'What they want', text: input.profileNeeds.slice(0, 3).join('; ') })
  if (input.nextMeeting) out.push({ label: 'Coming up', text: `${input.nextMeeting.title}, ${input.nextMeeting.when}` })
  if (input.nextTask) out.push({ label: 'Open task', text: `${input.nextTask.title}${input.nextTask.due ? `, due ${input.nextTask.due}` : ''}` })
  return out
}
