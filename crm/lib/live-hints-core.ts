/** Live Straight Line hints during a call: shared constants and the pure rules (no server imports). */

export const HINT_WINDOW_MS = 7000
export const MAX_WINDOW_BYTES = 700_000
export const MAX_CONTEXT_CHARS = 3000
export const HINT_STEPS = ['rapport', 'intelligence', 'control', 'threeTens', 'looping', 'closing', 'ethics'] as const
export type HintStep = (typeof HINT_STEPS)[number]
export type HintTone = 'do' | 'warn' | 'good'
export interface LiveHint {
  text: string
  step: HintStep | null
  tone: HintTone
}

/** Whisper invents short phrases on silence or noise; drop those instead of treating them as speech. */
const HALLUCINATIONS = /^(thank you\.?|thanks( for watching)?\.?|you\.?|bye\.?|\.+|okay\.?|ok\.?|uh+\.?|um+\.?|mm+\.?|hmm+\.?|subtitles by.*|transcribed by.*|תודה( רבה)?[.!]?|תודה שצפיתם[.!]?|תודה על הצפייה[.!]?|כתוביות.*|תרגום.*|תמלול.*|הירשמו לערוץ.*|ביי[.!]?)$/i
export function cleanSpeech(text: string): string {
  const t = text.trim()
  if (!t || HALLUCINATIONS.test(t)) return ''
  if (t.split(/\s+/).length < 2 && t.length < 4) return ''
  return t
}

/** Keeps the running transcript short: the last `max` characters, cut at a line start. */
export function trimContext(context: string, max = MAX_CONTEXT_CHARS): string {
  if (context.length <= max) return context
  const cut = context.slice(context.length - max)
  const nl = cut.indexOf('\n')
  return nl >= 0 ? cut.slice(nl + 1) : cut
}

/** A hint is shown only if it has real text, is short, and does not repeat one of the last few. */
export function acceptHint(h: LiveHint | null, recent: string[]): LiveHint | null {
  if (!h) return null
  const text = h.text.trim().replace(/\s+/g, ' ')
  if (text.length < 4 || text.length > 140) return null
  const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9֐-׿ ]/g, '')
  if (recent.some((r) => norm(r) === norm(text))) return null
  return { text, step: h.step, tone: h.tone }
}

/** The short rule set the live coach applies (a compact form of the Straight Line playbook). */
export const LIVE_HINT_RULES = `You are the Straight Line coach whispering to a salesperson (REP) of Igani (a web studio: websites, booking systems,
e-commerce, dashboards, automations, AI agents) DURING a live phone call with a prospect (CLIENT). You see the last minute or two of
the conversation, which may be in Hebrew, English or both. Give at most ONE short hint (max 12 words, imperative, plain words, in the
language the request names), or none. Judge Hebrew and English calls by the same rules.
Only speak when it is useful RIGHT NOW. Silence is fine. Never repeat a hint already shown.

Straight Line rules to apply:
- Opening: sharp, enthusiastic, authority, a clear reason for the call. No weak "is this a bad time?".
- Intelligence: qualify first with big-picture questions (what they use now, biggest headache, ultimate goal, what matters most), then
  specifics, money late and soft ("just a ballpark"). Let them talk; do not narrate or unload benefits (keep powder dry).
- Control: keep the call on the line; if they drift, let them finish then steer back with the next question. After the questions, bridge:
  "based on everything you told me, this is a perfect fit", then a SHORT presentation tied to their words.
- Three tens: product/solution, you, and Igani must each be convincing before asking for the order.
- The first "no" / "let me think about it" / "I need to talk to my partner" is a stall: stay calm, deflect ("I hear you, but does the idea
  make sense?"), then loop with a new angle; ask what exactly they need to discuss. Do not argue, quit or drop the price.
- Closing: calm, specific next step ("sound fair enough?"). 
- Ethics: never pressure, invent urgency or promise what Igani cannot deliver. If it is not a fit, end politely.
Tone "warn" = the rep is off the line or about to make a mistake; "do" = the next best move; "good" = brief praise (rare).`

export const HINT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['hint', 'step', 'tone'],
  properties: {
    hint: { type: ['string', 'null'] },
    step: { type: ['string', 'null'], enum: [...HINT_STEPS, null] },
    tone: { type: 'string', enum: ['do', 'warn', 'good'] },
  },
} as const
