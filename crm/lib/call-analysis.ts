import 'server-only'
import { openaiFetch, type AiFeature } from './ai-usage'
import { NOT_CONNECTED_MESSAGE, SHORT_CALL_MESSAGE, callLength, notConnected, tooShortToReview } from './call-review-rules'
import { getSetting } from './settings'
import { openAiReason } from './live-hints'
import { CALL_LANG_LABEL, TRANSCRIBE_PROMPT, callLanguage, coachingLanguage, reviewLanguageRule } from './call-language'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { logActivity } from './audit'
import { ensureRecordingSid, fetchRecordingAudio } from './call-recording'
import { PLAYBOOK, computeMetrics, type TranscriptSeg } from './call-coaching'
import { buildScore, deliveryMetrics } from './call-score'
import { judgeTonality } from './call-tonality'
import { prisma } from './prisma'
import { LINE_STAGES, STAGE_STATUSES, normalizeLineMap } from './line-map'
import { LESSON_INDEX_PROMPT, STRAIGHT_LINE_CHECKS, STRAIGHT_LINE_PLAYBOOK, snapLesson } from './straight-line'

/**
 * Call analysis (CallMap-style): Whisper transcript → structured analysis and coaching. Runs once per recording, after
 * Twilio's recording callback (and from the hourly job as a retry). Audio goes to OpenAI for transcription only.
 */

const MAX_AUDIO_BYTES = 24 * 1024 * 1024 // OpenAI's upload limit is 25 MB
const MAX_ATTEMPTS = 3
// Calls under a minute (voicemail beeps, wrong numbers, quick hang-ups) are not reviewed automatically: see lib/call-review-rules.ts

export interface TranscriptLine {
  start: number
  end: number
  text: string
  speaker: 'rep' | 'client'
}

const Clamp = (min: number, max: number) => z.number().transform((n) => Math.max(min, Math.min(max, Math.round(n))))
const Str = (max: number) => z.string().transform((s) => s.trim().slice(0, max))
const List = (max: number, len = 240) => z.array(Str(len)).transform((a) => a.filter(Boolean).slice(0, max))

const Status = z.enum(['covered', 'partly', 'missing', 'not_expected'])
const Qual = z.object({ status: Status, note: z.string().nullable().transform((x) => (x ? x.trim().slice(0, 240) || null : null)) })
const Count = Clamp(0, 200)

/** v2 (research-based coaching). Fields added in v2 are optional so analyses saved before still read. */
export const STEPS = ['rapport', 'intelligence', 'control', 'threeTens', 'looping', 'closing', 'ethics'] as const
const CHECK_IDS = STRAIGHT_LINE_CHECKS.map((c) => c.id)
const SlScore = Clamp(1, 5).nullable()

/** Control of the Call coaching (optional: calls analysed before it was added don't have it). */
const StraightLine = z
  .object({
    verdict: Str(300).optional(),
    scores: z.object({ rapport: SlScore, intelligence: SlScore, control: SlScore, threeTens: SlScore, looping: SlScore, closing: SlScore }),
    /** one line per skill: the evidence behind its grade */
    why: z.record(z.string(), z.string().nullable()).optional().catch(undefined),
    checks: z.array(z.object({ id: z.string(), result: z.enum(['yes', 'no', 'na']), evidence: z.string().nullable() })),
    lessons: z.array(z.object({ ep: z.number(), startSec: z.number(), why: Str(240) })),
  })
  .transform((sl) => {
    const seen = new Set<string>()
    const lessons = sl.lessons.flatMap((l) => {
      const ref = snapLesson(Math.round(l.ep), l.startSec)
      const key = ref ? `${ref.ep}:${ref.startSec}` : ''
      if (!ref || seen.has(key)) return []
      seen.add(key)
      return [{ ep: ref.ep, startSec: ref.startSec, topic: ref.topic, why: l.why }]
    })
    return {
      verdict: sl.verdict,
      scores: sl.scores,
      why: sl.why ? Object.fromEntries(Object.entries(sl.why).flatMap(([k, v]) => (v && v.trim() ? [[k, v.trim().slice(0, 240)]] : []))) : undefined,
      checks: sl.checks.filter((c) => CHECK_IDS.includes(c.id)).map((c) => ({ id: c.id, result: c.result, evidence: c.evidence ? c.evidence.trim().slice(0, 240) || null : null })),
      lessons: lessons.slice(0, 3),
    }
  })

/** The call drawn on the line (stages, path around the line, action-threshold curve). Optional: older analyses don't have it. */
const LineMapZ = z
  .object({
    stages: z.array(z.object({ key: z.string(), status: z.string(), at: z.number().nullable(), note: z.string().nullable() })),
    path: z.array(z.object({ t: z.number(), offset: z.number() })),
    threshold: z.object({ points: z.array(z.object({ t: z.number(), level: z.number() })), actAt: z.number() }),
  })
  .transform((m) => normalizeLineMap(m))

export const CallAnalysis = z.object({
  v: z.number().optional(),
  isSalesCall: z.boolean(),
  callType: Str(60),
  language: Str(20),
  /** detected from the transcript: spoken language, and the language this review is written in */
  lang: z.enum(['he', 'en', 'mixed']).optional(),
  reviewIn: z.enum(['he', 'en']).optional(),
  summary: Str(1200),
  outcome: z.object({ label: Str(120), score: Clamp(0, 100) }),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  nextStep: z.string().nullable().transform((s) => (s ? s.trim().slice(0, 300) || null : null)),
  nextStepQuality: z.enum(['specific', 'vague', 'none']).optional(),
  clientNeeds: List(8),
  objections: z.array(z.object({ objection: Str(240), response: Str(300), handledWell: z.boolean(), better: z.string().nullable().optional() })).transform((a) => a.slice(0, 8).map((o) => ({ ...o, better: o.better ? o.better.trim().slice(0, 300) : null }))),
  actionItems: z.array(z.object({ owner: z.enum(['rep', 'client']), text: Str(240) })).transform((a) => a.filter((x) => x.text).slice(0, 10)),
  talkRatioRep: Clamp(0, 100),
  questionsAsked: Clamp(0, 500),
  scores: z.object({ opening: Clamp(1, 5), discovery: Clamp(1, 5), listening: Clamp(1, 5).optional(), value: Clamp(1, 5), objections: Clamp(1, 5), closing: Clamp(1, 5) }),
  overallScore: Clamp(0, 100),
  strengths: List(5),
  improvements: List(5),
  moments: z
    .array(z.object({ at: z.number().nullable(), step: z.enum(STEPS).nullable().optional().catch(null), clientSaid: z.string().nullable(), repSaid: Str(400), better: Str(400), why: Str(300) }))
    .transform((a) => a.slice(0, 5).map((m) => ({ ...m, step: m.step ?? null, at: m.at == null ? null : Math.max(0, Math.round(m.at)), clientSaid: m.clientSaid ? m.clientSaid.trim().slice(0, 300) : null }))),
  qualification: z.object({ pain: Qual, impact: Qual, decisionMaker: Qual, decisionProcess: Qual, budget: Qual, timeline: Qual, alternatives: Qual }).optional(),
  spin: z.object({ situation: Count, problem: Count, implication: Count, needPayoff: Count }).optional(),
  buyingSignals: List(6).optional(),
  riskSignals: List(6).optional(),
  nextQuestions: List(6).optional(),
  focus: z.array(z.object({ skill: Str(80), why: Str(240), drill: Str(300), sayThis: Str(300) })).transform((a) => a.slice(0, 2)).optional(),
  straightLine: StraightLine.optional(),
  lineMap: LineMapZ.nullable().optional().catch(null),
  /** v3: how the rep sounded (from the audio) and pace / fillers (from the timestamps) */
  tonality: z
    .object({
      dims: z.record(z.string(), z.number().nullable()),
      summary: z.string(),
      clientMood: z.enum(['warming', 'steady', 'cooling']).nullable(),
      moments: z.array(z.object({ at: z.number().nullable(), note: z.string(), tryThis: z.string().nullable() })),
      coveredSec: z.number().nullable().optional(),
    })
    .nullable()
    .optional()
    .catch(null),
  delivery: z.object({ repWpm: z.number(), fillersPerMin: z.number(), fillers: z.array(z.string()) }).nullable().optional().catch(null),
  metrics: z
    .object({
      talkRatioRep: z.number(),
      repSeconds: z.number(),
      clientSeconds: z.number(),
      longestMonologueSec: z.number(),
      longestMonologueAt: z.number().nullable(),
      longestClientStretchSec: z.number(),
      repQuestions: z.number(),
      questionSpread: z.tuple([z.number(), z.number(), z.number()]),
      switchesPerMin: z.number(),
    })
    .optional(),
})
export type CallAnalysis = z.infer<typeof CallAnalysis>

const STR = { type: 'string' } as const
const STRS = { type: 'array', items: STR } as const
const SLNUM = { type: ['number', 'null'] } as const
const NUM = { type: 'number' } as const
const QUAL = { type: 'object', additionalProperties: false, required: ['status', 'note'], properties: { status: { type: 'string', enum: ['covered', 'partly', 'missing', 'not_expected'] }, note: { type: ['string', 'null'] } } } as const
const obj = (props: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(props), properties: props })

const SPEAKER_SCHEMA = obj({ speakers: { type: 'array', description: 'One entry per transcript segment, in order: who spoke it', items: { type: 'string', enum: ['rep', 'client'] } } })

const ANALYSIS_SCHEMA = obj({
  isSalesCall: { type: 'boolean' },
  callType: STR,
  language: STR,
  summary: STR,
  outcome: obj({ label: STR, score: NUM }),
  sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
  nextStep: { type: ['string', 'null'] },
  nextStepQuality: { type: 'string', enum: ['specific', 'vague', 'none'] },
  clientNeeds: STRS,
  objections: { type: 'array', items: obj({ objection: STR, response: STR, handledWell: { type: 'boolean' }, better: { type: ['string', 'null'] } }) },
  actionItems: { type: 'array', items: obj({ owner: { type: 'string', enum: ['rep', 'client'] }, text: STR }) },
  scores: obj({ opening: NUM, discovery: NUM, listening: NUM, value: NUM, objections: NUM, closing: NUM }),
  qualification: obj({ pain: QUAL, impact: QUAL, decisionMaker: QUAL, decisionProcess: QUAL, budget: QUAL, timeline: QUAL, alternatives: QUAL }),
  spin: obj({ situation: NUM, problem: NUM, implication: NUM, needPayoff: NUM }),
  buyingSignals: STRS,
  riskSignals: STRS,
  strengths: STRS,
  improvements: STRS,
  focus: { type: 'array', items: obj({ skill: STR, why: STR, drill: STR, sayThis: STR }) },
  nextQuestions: STRS,
  straightLine: obj({
    verdict: STR,
    scores: obj({ rapport: SLNUM, intelligence: SLNUM, control: SLNUM, threeTens: SLNUM, looping: SLNUM, closing: SLNUM }),
    why: obj({ rapport: { type: ['string', 'null'] }, intelligence: { type: ['string', 'null'] }, control: { type: ['string', 'null'] }, threeTens: { type: ['string', 'null'] }, looping: { type: ['string', 'null'] }, closing: { type: ['string', 'null'] } }),
    checks: { type: 'array', items: obj({ id: { type: 'string', enum: STRAIGHT_LINE_CHECKS.map((c) => c.id) }, result: { type: 'string', enum: ['yes', 'no', 'na'] }, evidence: { type: ['string', 'null'] } }) },
    lessons: { type: 'array', items: obj({ ep: NUM, startSec: NUM, why: STR }) },
  }),
  lineMap: obj({
    stages: { type: 'array', items: obj({ key: { type: 'string', enum: [...LINE_STAGES] }, status: { type: 'string', enum: [...STAGE_STATUSES] }, at: { type: ['number', 'null'] }, note: { type: ['string', 'null'] } }) },
    path: { type: 'array', items: obj({ t: NUM, offset: NUM }) },
    threshold: obj({ points: { type: 'array', items: obj({ t: NUM, level: NUM }) }, actAt: NUM }),
  }),
  moments: { type: 'array', items: obj({ at: { type: ['number', 'null'] }, step: { type: ['string', 'null'], enum: [...STEPS, null] }, clientSaid: { type: ['string', 'null'] }, repSaid: STR, better: STR, why: STR }) },
})

const SPEAKER_PROMPT = `You label who is speaking in a phone call transcript between a salesperson at Igani ("rep") and a client
("client"). The call may be in Hebrew, English or both. Return one label per segment, in order. Use the content: the rep introduces Igani, asks about the client's
business, explains what Igani builds, proposes next steps; the client describes their business, needs and concerns.
Speakers alternate often but not always. Return JSON matching the schema.`

const PROMPT = `You are the Control of the Call teacher reviewing one recorded call by a salesperson ("rep") at Igani with a prospect or
client ("client"). Our sales method is the Control of the Call (described below). EVERYTHING you write about the call is judged by it and
worded in its terms (the line, the first four seconds, the three tens, the first no, looping, the soft close). Name the step each
comment relates to. Generic sales advice that is not in the method is secondary. You get the transcript (segments with timestamps
and speakers) and metrics MEASURED from the recording. Trust the measured metrics over your own impression and use them as
supporting facts.

${PLAYBOOK}

${STRAIGHT_LINE_PLAYBOOK}

SCORING ANCHORS (straightLine.scores, 1 to 5; null when the call never reached that part). Score what the REP did, not how good
the lead was. Every 4 or 5 needs a quote that proves it; without one it is at most 3. 3 is solid, 4 is clearly good, 5 is rare.
- rapport: 1 = flat or mumbled opener, no reason for the call, or pushy; 3 = clear intro and reason, polite, some connection;
  5 = sharp, enthusiastic and expert in the first seconds, client warms up and engages, care is obvious.
- intelligence: 1 = pitched without asking; 3 = several relevant questions, the basic need is known; 5 = big-picture to specific,
  pain, impact and timeline found in the client's own words and paraphrased back.
- control: 1 = the client steered, long off-topic stretches, the rep rambled; 3 = mostly on track with some drift; 5 = every tangent
  brought back politely, a clear agenda, the client followed the rep's lead.
- threeTens: 1 = no case for the solution, the rep or Igani; 3 = fit explained in general terms; 5 = a tailored case tied to the
  client's words and the client said they believe it.
- looping: null if no objection or stall came up; 1 = quit or argued at the first no; 3 = acknowledged and answered once;
  5 = explored the real concern, came back from a new angle and the client moved.
- closing: 1 = no ask; 2 = "I'll send you something"; 3 = asked for a next step, but vague; 5 = calm, specific, dated next step the
  client agreed to.
straightLine.why: for each skill, one short line with the evidence (a quote or what happened) behind its grade, or null.

LESSON INDEX (episode | start second | topic): cite ONLY these in straightLine.lessons
${LESSON_INDEX_PROMPT}

Return JSON matching the schema:
- isSalesCall: false for voicemail, wrong numbers and non-sales chats (then keep everything short; scores 3).
- callType: e.g. "Discovery call", "Proposal follow-up", "Closing call", "Support", "Voicemail".
- language; summary (3–5 factual sentences); outcome (label + 0–100 for how good the result is for the sale).
- nextStep: the agreed next step or null; nextStepQuality: specific (dated, who/what), vague, or none.
- clientNeeds: in the client's terms. objections: each with the rep's response, handledWell (per LAER), and better: a
  stronger response in the call's language (null if it was handled well).
- actionItems: commitments by the rep or the client.
- scores: 1–5 for opening, discovery, listening, value, objections, closing. Derive them from your Control of the Call scores
  (opening from rapport, discovery and listening from intelligence, value from threeTens, objections from looping, closing from
  closing). Be calibrated: 3 is solid, 5 is rare. Use the measured talk ratio, monologue and question metrics when scoring discovery and listening.
- qualification: for each item, covered / partly / missing / not_expected (for this stage) and a short note on what
  was learned or what's missing.
- spin: how many of the rep's questions were situation, problem, implication and need-payoff questions.
- buyingSignals / riskSignals: short, specific, from this call (empty if none).
- strengths (2–4, first one = the best moment) and improvements (2–4): specific to this call, quote it, and say which Control of the Call
  idea each is an example of.
- focus: the 1–2 Control of the Call changes that would most improve the next call: skill (a Control of the Call skill), why it matters, a short drill, and sayThis:
  the exact words to try next time, in the call's language.
- nextQuestions: 3–5 questions the rep should ask next time (in the call's language) to fill the gaps.
- straightLine: this is the heart of the review. verdict: ONE sentence in the teacher's voice on how the rep did on the line (for
  example where they stayed on it and where they left it). scores: 1 to 5 per skill, or null when it does not apply
  (voicemail, support, nothing to judge). checks: one entry for EVERY check id, result yes / no / na, with a short evidence quote
  or null. lessons: 0 to 3 lessons from the LESSON INDEX that would help this rep most, as { ep, startSec, why } where why says in one
  sentence what in THIS call the lesson addresses. Do not coach deceptive or pressuring lines.
- lineMap: draw the call on the Control of the Call. stages: one entry for each stage of the line (open, questions, bridge, presentation,
  firstNo, loop, close) with status good (done well), shaky (done but weak), blown (done badly or damaged the call), skipped (the call
  got there but the rep did not do it, e.g. no bridge) or notReached (the call ended first), at (second it happened, or null) and a
  short note quoting or describing what happened. path: 10 to 18 points over the whole call {t seconds, offset}: 0 = on the line,
  +-1 = at a boundary, beyond +-1 = off the line (the rep lost control: chatting, arguing, letting the prospect steer, rambling).
  threshold: 8 to 14 points {t, level 0 to 10} = how ready the prospect is to act, rising with rapport, a real fit, strong tens and
  good loops, falling with doubt, stalls and pushy lines; actAt = the level at which they would act (usually 8 to 10); a yes means
  the curve reaches it. Base every point on the transcript. Do not invent. For voicemail or non-sales calls return empty arrays.
- moments: up to 3 coaching moments where the rep left the line or missed a Control of the Call step: at (seconds), step (which step:
  rapport, intelligence, control, threeTens, looping, closing or ethics), clientSaid (or null), repSaid (verbatim), better (in the review language),
  why (one sentence in the review language).
Write in the review language the request names (English unless it says otherwise); quotes stay exactly as spoken. Calls may be in
Hebrew, English or switch between them mid-sentence: understand both equally and judge the rep the same way in either language
(Hebrew phone etiquette is more direct; do not mark that as rude). Never invent facts. No markdown, no em dashes.`

async function transcribe(audio: Blob, key: string, fileName = 'call.mp3'): Promise<{ text: string; segments: { start: number; end: number; text: string }[] }> {
  const form = new FormData()
  // OpenAI reads the format from the file name, so an uploaded m4a must not be sent as .mp3
  form.append('file', audio, fileName)
  form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1')
  form.append('response_format', 'verbose_json')
  form.append('timestamp_granularities[]', 'segment')
  // Hebrew, English or both: a bilingual sample keeps each language as spoken
  if (!/gpt-4o/.test(process.env.OPENAI_TRANSCRIBE_MODEL ?? '')) form.append('prompt', TRANSCRIBE_PROMPT)
  const post = (): Promise<Response> => openaiFetch('transcription', 'https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(240_000) })
  let res = await post()
  // a busy or briefly failing OpenAI gets one more try before the call is marked as failed
  if (!res.ok && (res.status === 429 || res.status >= 500)) {
    await new Promise((r) => setTimeout(r, process.env.VITEST ? 0 : 3000))
    res = await post()
  }
  if (!res.ok) {
    const reason = await openAiReason(res)
    console.error('[call-analysis] transcription refused', res.status, reason)
    throw new Error(res.status === 429 ? 'OpenAI is busy or out of credit.' : `Transcription failed (${res.status})${res.status === 400 && reason ? `: ${String(reason).slice(0, 160)}` : ''}.`)
  }
  const body = (await res.json()) as { text?: string; segments?: { start: number; end: number; text: string }[] }
  const segments = (body.segments ?? []).map((s) => ({ start: Math.max(0, s.start), end: Math.max(0, s.end), text: s.text.trim() })).filter((s) => s.text)
  return { text: body.text ?? segments.map((s) => s.text).join(' '), segments }
}

/** The model for call reviews: the one typed in Admin → Phone, else the env var, else the default. */
export async function reviewModelName(): Promise<string> {
  const set = await getSetting('calls.reviewModel').catch(() => '')
  return set.trim() || process.env.OPENAI_CALL_MODEL || process.env.OPENAI_OFFER_MODEL || 'gpt-5.5'
}

export async function chat(key: string, system: string, user: string, name: string, schema: object, effort: 'low' | 'medium', modelName?: string, feature: AiFeature = 'call-review'): Promise<unknown> {
  const model = modelName || process.env.OPENAI_CALL_MODEL || process.env.OPENAI_OFFER_MODEL || 'gpt-5.5'
  const reasoning = /^(gpt-5|o\d)/.test(model)
  const res = await openaiFetch(feature, 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      ...(reasoning ? { reasoning_effort: effort } : { temperature: 0.2 }),
      response_format: { type: 'json_schema', json_schema: { name, strict: true, schema } },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
    signal: AbortSignal.timeout(240_000),
  })
  if (!res.ok) throw new Error(res.status === 429 ? 'OpenAI is busy or out of credit.' : `Analysis failed (${res.status}).`)
  const body = (await res.json()) as { choices?: { message?: { content?: string; refusal?: string } }[] }
  const msg = body.choices?.[0]?.message
  if (msg?.refusal) throw new Error('The analysis was declined.')
  return JSON.parse(msg?.content ?? '{}')
}

const mmss = (sec: number): string => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

/** The headline score, built from skills, tonality, the measured conversation and the result (see lib/call-score). */
export function scoreFromAnalysis(a: CallAnalysis): number {
  return buildScore(a).total
}

/**
 * Two passes: (1) who said each line, (2) metrics measured from the timestamps, then the coaching analysis with those
 * numbers in hand. The score is the rubric average (consistent from call to call), not the model's own number.
 */
export async function analyseSegments(segments: { start: number; end: number; text: string }[], key: string, context = 'Outgoing call: the rep called the client.', opts: { audio?: Blob; durationSec?: number | null } = {}): Promise<{ speakers: ('rep' | 'client')[]; analysis: CallAnalysis }> {
  const numbered = segments.map((s, i) => `[${i}] (${mmss(s.start)}) ${s.text}`).join('\n')
  const voicemail = /^Voicemail/.test(context)
  const modelName = await reviewModelName()
  const sp = voicemail ? { speakers: segments.map(() => 'client') } : ((await chat(key, SPEAKER_PROMPT, `${context}\n${numbered}`, 'speakers', SPEAKER_SCHEMA, 'low', modelName)) as { speakers?: unknown })
  const speakers = segments.map((_, i) => ((Array.isArray(sp.speakers) ? sp.speakers[i] : null) === 'client' ? 'client' : 'rep') as 'rep' | 'client')
  const lines: TranscriptSeg[] = segments.map((s, i) => ({ ...s, speaker: speakers[i]! }))
  const metrics = computeMetrics(lines)
  const measured = metrics
    ? `Measured from the recording: rep talk ${metrics.talkRatioRep}% (rep ${mmss(metrics.repSeconds)}, client ${mmss(metrics.clientSeconds)}); longest rep monologue ${mmss(metrics.longestMonologueSec)}${metrics.longestMonologueAt != null ? ` at ${mmss(metrics.longestMonologueAt)}` : ''}; longest client stretch ${mmss(metrics.longestClientStretchSec)}; rep questions ${metrics.repQuestions} (by third of the call: ${metrics.questionSpread.join(' / ')}); speaker switches ${metrics.switchesPerMin}/min.`
    : 'Metrics: not enough speech to measure.'
  const transcript = lines.map((l, i) => `[${i}] (${mmss(l.start)}, ${Math.round(l.start)}s) ${l.speaker.toUpperCase()}: ${l.text}`).join('\n')
  const said = segments.map((s) => s.text).join(' ')
  const lang = callLanguage(said)
  const reviewIn = coachingLanguage(said)
  const delivery = voicemail ? null : deliveryMetrics(lines)
  // the voice is judged from the audio at the same time as the words are reviewed
  const [raw, tonality] = await Promise.all([
    chat(key, PROMPT, `${context}\n${measured}${delivery ? `\nRep pace ${delivery.repWpm} words/min; filler words ${delivery.fillersPerMin}/min.` : ''}\nSpoken language (measured): ${CALL_LANG_LABEL[lang]}.\n${reviewLanguageRule(reviewIn, lang)}\n\nTranscript:\n${transcript}`, 'call_analysis', ANALYSIS_SCHEMA, 'medium', modelName) as Promise<Record<string, unknown>>,
    opts.audio && !voicemail ? judgeTonality(opts.audio, lines, { key, durationSec: opts.durationSec ?? null, reviewLanguage: reviewIn }) : Promise.resolve(null),
  ])
  const analysis = CallAnalysis.parse({ ...raw, v: 3, language: CALL_LANG_LABEL[lang], lang, reviewIn, talkRatioRep: metrics?.talkRatioRep ?? 50, questionsAsked: metrics?.repQuestions ?? 0, overallScore: 0, metrics: metrics ?? undefined, delivery, tonality })
  // built from the validated parts (lib/call-score), so one odd value from a model can't skew it
  analysis.overallScore = scoreFromAnalysis(analysis)
  return { speakers, analysis }
}

/**
 * Analyses one call's recording. Safe to call repeatedly and from several places at once: it claims the call first
 * (pending → processing), gives up after a few failed attempts, and skips recordings too short or too long.
 */
export async function analyzeCall(callId: string, opts: { force?: boolean; ignoreMinimum?: boolean } = {}): Promise<'ready' | 'skipped' | 'failed' | 'busy' | 'none'> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return 'none'
  const recordingSid = await ensureRecordingSid(callId)
  if (!recordingSid) return 'none'
  const claim = await prisma.call.updateMany({
    where: {
      id: callId,
      analysisAttempts: { lt: opts.force ? 99 : MAX_ATTEMPTS },
      OR: [{ analysisStatus: { in: ['pending', 'failed', ...(opts.force ? ['ready', 'skipped'] : [])] } }, { analysisStatus: null }, { analysisStatus: 'processing', analyzedAt: { lt: new Date(Date.now() - 10 * 60_000) } }],
    },
    data: { analysisStatus: 'processing', analyzedAt: new Date(), analysisAttempts: { increment: 1 }, analysisError: null },
  })
  if (!claim.count) return 'busy'
  const call = await prisma.call.findUniqueOrThrow({ where: { id: callId }, select: { leadId: true, userId: true, recordingSec: true, durationSec: true, direction: true, answeredAt: true, status: true } })
  const fail = async (status: 'failed' | 'skipped', error: string): Promise<'failed' | 'skipped'> => {
    await prisma.call.update({ where: { id: callId }, data: { analysisStatus: status, analysisError: error.slice(0, 300), analyzedAt: new Date() } })
    return status
  }
  try {
    // Nobody picked up: nothing to review, even by hand
    if (notConnected(call)) return await fail('skipped', NOT_CONNECTED_MESSAGE)
    // An admin reviewing a short call by hand (ignoreMinimum) skips this check
    if (!opts.ignoreMinimum && tooShortToReview(callLength(call))) return await fail('skipped', SHORT_CALL_MESSAGE)
    const audioRes = await fetchRecordingAudio(recordingSid)
    if (!audioRes) return await fail('failed', 'Could not download the recording from Twilio.')
    const audio = await audioRes.blob()
    if (audio.size > MAX_AUDIO_BYTES) return await fail('skipped', 'The recording is too long to analyse automatically (over ~45 minutes).')
    const { segments } = await transcribe(audio, key)
    if (segments.length < 2) return await fail('skipped', 'Nothing was said on the recording.')
    const context =
      call.direction === 'INBOUND'
        ? call.answeredAt
          ? 'Incoming call: the client called Igani and the rep answered.'
          : 'Voicemail: the caller left a message; nobody from Igani speaks. Mark every segment "client", isSalesCall false, and summarise who called and what they want.'
        : 'Outgoing call: the rep called the client.'
    const { speakers, analysis } = await analyseSegments(segments.slice(0, 800), key, context, { audio, durationSec: call.recordingSec ?? null })
    const transcript: TranscriptLine[] = segments.map((s, i) => ({ ...s, speaker: speakers[i] ?? 'rep' }))
    await prisma.call.update({
      where: { id: callId },
      data: { transcript: transcript as unknown as Prisma.InputJsonValue, analysis: analysis as unknown as Prisma.InputJsonValue, analysisStatus: 'ready', analyzedAt: new Date(), analysisError: null },
    })
    if (call.leadId) {
      await logActivity({ entityType: 'LEAD', entityId: call.leadId, actorId: null, action: 'call.analyzed', metadata: { callId, summary: analysis.summary.slice(0, 600), outcome: analysis.outcome.label, nextStep: analysis.nextStep } })
      // what the call taught us about the client: profile, empty fields, booked time, next steps (lib/lead-intel.ts)
      const { enrichLeadFromCall } = await import('./lead-intel')
      await enrichLeadFromCall(callId, transcript, analysis.reviewIn ?? 'en')
    }
    return 'ready'
  } catch (err) {
    console.error('[call-analysis] failed', callId, err instanceof Error ? err.message : err)
    return await fail('failed', err instanceof Error ? err.message : 'The analysis failed.')
  }
}

/**
 * Reviews audio an admin uploaded for a call that has no Twilio recording (a training call, say), exactly like a live call: the same
 * transcription, speaker split, review and tone check. The audio is not kept; only the transcript and the review are saved.
 * It skips the 60-second minimum, like an admin's "Review anyway".
 */
export async function analyzeUploadedCall(callId: string, audio: Blob, fileName = 'call.m4a'): Promise<'ready' | 'failed' | 'none'> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return 'none'
  const fail = async (error: string): Promise<'failed'> => {
    await prisma.call.update({ where: { id: callId }, data: { analysisStatus: 'failed', analysisError: error.slice(0, 300), analyzedAt: new Date() } })
    return 'failed'
  }
  try {
    await prisma.call.update({ where: { id: callId }, data: { analysisStatus: 'processing', analyzedAt: new Date(), analysisAttempts: { increment: 1 } } })
    const { segments } = await transcribe(audio, key, fileName)
    if (segments.length < 2) return await fail('Nothing was said on the recording.')
    const last = segments[segments.length - 1]
    const seconds = Math.max(1, Math.round(last?.end ?? 0))
    const { speakers, analysis } = await analyseSegments(segments.slice(0, 800), key, 'Outgoing call: the rep called the client.', { audio, durationSec: seconds })
    const transcript: TranscriptLine[] = segments.map((s, i) => ({ ...s, speaker: speakers[i] ?? 'rep' }))
    await prisma.call.update({
      where: { id: callId },
      data: { transcript: transcript as unknown as Prisma.InputJsonValue, analysis: analysis as unknown as Prisma.InputJsonValue, analysisStatus: 'ready', analyzedAt: new Date(), analysisError: null, durationSec: seconds, recordingSec: seconds },
    })
    // an uploaded call on a lead teaches us about the client too
    const { enrichLeadFromCall } = await import('./lead-intel')
    await enrichLeadFromCall(callId, transcript, analysis.reviewIn ?? 'en')
    return 'ready'
  } catch (err) {
    console.error('[call-analysis] upload review failed', callId, err instanceof Error ? err.message : err)
    return await fail(err instanceof Error ? err.message : 'The review failed.')
  }
}

export const asAnalysis = (v: unknown): CallAnalysis | null => {
  const r = CallAnalysis.safeParse(v)
  if (!r.success) return null
  // always scored with the current formula, so every call (old or new) is compared on the same scale
  r.data.overallScore = scoreFromAnalysis(r.data)
  return r.data
}
export const asTranscript = (v: unknown): TranscriptLine[] =>
  Array.isArray(v) ? (v as TranscriptLine[]).filter((l) => l && typeof l.text === 'string' && typeof l.start === 'number').map((l) => ({ ...l, speaker: l.speaker === 'client' ? 'client' : 'rep' })) : []
