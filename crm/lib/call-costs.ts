/**
 * An ESTIMATE of what the phone system costs per month, worked out from the calls already stored. Pure (no database).
 * The rates are Twilio's and OpenAI's public prices at the time of writing; check the real bills.
 */

/** US dollars per minute. Israeli mobile numbers start +9725; other Israeli numbers are landlines. */
export const RATES = {
  /** Outbound to an Israeli mobile (Twilio price list for Israel) */
  ilMobile: 0.1868,
  /** Outbound to another Israeli number */
  ilOther: 0.0294,
  /** Outbound to the US */
  us: 0.014,
  /** Anywhere else: a rough middle figure, since the real rate depends on the country */
  otherCountry: 0.1,
  /** The browser leg of a call made from the CRM (Twilio Voice JavaScript SDK) */
  browserLeg: 0.004,
  /** Answering an incoming call, roughly */
  inbound: 0.01,
  /** Recording, per recorded minute */
  recording: 0.0025,
  /** Transcribing a reviewed call, per minute */
  transcription: 0.006,
  /** Reviewing a call: the written review plus the voice-tone check, per reviewed call (estimate from typical call length) */
  reviewPerCall: 0.18,
  /** Live coaching hints during a call, per talk minute (transcribing both sides plus the hint model) */
  liveHintsPerMinute: 0.009,
} as const

export type CostCall = {
  userId: string | null
  userName: string
  /** ISO month key (YYYY-MM) of when the call started, on Israel time */
  month: string
  direction: 'INBOUND' | 'OUTBOUND'
  /** The number on the far end (E.164) */
  otherNumber: string
  /** Talk time once answered, in seconds */
  durationSec: number | null
  recordingSec: number | null
  /** 'ready' when an AI review was produced */
  analysisStatus: string | null
}

export interface CostRow {
  dials: number
  answered: number
  /** Billed minutes (each answered call rounded up) */
  minutes: number
  phone: number
  recording: number
  ai: number
  total: number
}

export const emptyRow = (): CostRow => ({ dials: 0, answered: 0, minutes: 0, phone: 0, recording: 0, ai: 0, total: 0 })

const minutesOf = (sec: number | null | undefined): number => (sec && sec > 0 ? Math.ceil(sec / 60) : 0)

/** The per-minute price of the far-end number for an outgoing call. */
export function outboundRate(number: string): number {
  const n = number.replace(/[^\d+]/g, '')
  if (n.startsWith('+9725')) return RATES.ilMobile
  if (n.startsWith('+972')) return RATES.ilOther
  if (n.startsWith('+1')) return RATES.us
  return RATES.otherCountry
}

export interface CallCost {
  answered: boolean
  minutes: number
  phone: number
  recording: number
  ai: number
}

/** The estimated cost of one call, split into phone, recording and AI. */
export function costOf(c: CostCall, liveHints: boolean): CallCost {
  const talk = minutesOf(c.durationSec)
  const answered = talk > 0
  const perMinute = c.direction === 'OUTBOUND' ? outboundRate(c.otherNumber) + RATES.browserLeg : RATES.inbound
  const phone = answered ? talk * perMinute : 0
  const recMin = minutesOf(c.recordingSec)
  const recording = recMin * RATES.recording
  const reviewed = c.analysisStatus === 'ready'
  const ai = (reviewed ? recMin * RATES.transcription + RATES.reviewPerCall : 0) + (liveHints && answered ? talk * RATES.liveHintsPerMinute : 0)
  return { answered, minutes: talk, phone, recording, ai }
}

function add(row: CostRow, c: CallCost): void {
  row.dials += 1
  if (c.answered) row.answered += 1
  row.minutes += c.minutes
  row.phone += c.phone
  row.recording += c.recording
  row.ai += c.ai
  row.total = row.phone + row.recording + row.ai
}

export interface MonthCosts {
  month: string
  all: CostRow
  perPerson: { userId: string | null; name: string; row: CostRow }[]
}

/** Costs per month, newest first, with a split per salesperson. Months with no calls are left out. */
export function costsByMonth(calls: CostCall[], liveHints: boolean): MonthCosts[] {
  const months = new Map<string, MonthCosts>()
  for (const call of calls) {
    const m = months.get(call.month) ?? { month: call.month, all: emptyRow(), perPerson: [] }
    months.set(call.month, m)
    const cost = costOf(call, liveHints)
    add(m.all, cost)
    let p = m.perPerson.find((x) => x.userId === call.userId)
    if (!p) {
      p = { userId: call.userId, name: call.userName, row: emptyRow() }
      m.perPerson.push(p)
    }
    add(p.row, cost)
  }
  for (const m of months.values()) m.perPerson.sort((a, b) => b.row.total - a.row.total)
  return [...months.values()].sort((a, b) => b.month.localeCompare(a.month))
}

/** Dollars, with cents only for small amounts. */
export function usd(n: number): string {
  return '$' + n.toFixed(n < 10 ? 2 : 0)
}

/** A small per-minute price with the digits that matter ($0.0025, $0.014, $0.19). */
export function rateUsd(n: number): string {
  const t = n.toFixed(4).replace(/0+$/, '')
  const [whole, frac = ''] = t.split('.')
  return '$' + whole + '.' + frac.padEnd(2, '0')
}
