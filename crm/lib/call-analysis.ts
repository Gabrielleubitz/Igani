import 'server-only'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { logActivity } from './audit'
import { ensureRecordingSid, fetchRecordingAudio } from './call-recording'
import { PLAYBOOK, computeMetrics, scoreFromRubric, type TranscriptSeg } from './call-coaching'
import { prisma } from './prisma'
import { LESSON_INDEX_PROMPT, STRAIGHT_LINE_CHECKS, STRAIGHT_LINE_PLAYBOOK, snapLesson } from './straight-line'

/**
 * Call analysis (CallMap-style): Whisper transcript → structured analysis and coaching. Runs once per recording, after
 * Twilio's recording callback (and from the hourly job as a retry). Audio goes to OpenAI for transcription only.
 */

const MAX_AUDIO_BYTES = 24 * 1024 * 1024 // OpenAI's upload limit is 25 MB
const MAX_ATTEMPTS = 3
const MIN_SECONDS = 15 // shorter recordings (voicemail beeps, wrong numbers) aren't worth coaching

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
const CHECK_IDS = STRAIGHT_LINE_CHECKS.map((c) => c.id)
const SlScore = Clamp(1, 5).nullable()

/** Straight Line coaching (optional: calls analysed before it was added don't have it). */
const StraightLine = z
  .object({
    scores: z.object({ rapport: SlScore, intelligence: SlScore, control: SlScore, threeTens: SlScore, looping: SlScore, closing: SlScore }),
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
      scores: sl.scores,
      checks: sl.checks.filter((c) => CHECK_IDS.includes(c.id)).map((c) => ({ id: c.id, result: c.result, evidence: c.evidence ? c.evidence.trim().slice(0, 240) || null : null })),
      lessons: lessons.slice(0, 3),
    }
  })

export const CallAnalysis = z.object({
  v: z.number().optional(),
  isSalesCall: z.boolean(),
  callType: Str(60),
  language: Str(20),
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
    .array(z.object({ at: z.number().nullable(), clientSaid: z.string().nullable(), repSaid: Str(400), better: Str(400), why: Str(300) }))
    .transform((a) => a.slice(0, 5).map((m) => ({ ...m, at: m.at == null ? null : Math.max(0, Math.round(m.at)), clientSaid: m.clientSaid ? m.clientSaid.trim().slice(0, 300) : null }))),
  qualification: z.object({ pain: Qual, impact: Qual, decisionMaker: Qual, decisionProcess: Qual, budget: Qual, timeline: Qual, alternatives: Qual }).optional(),
  spin: z.object({ situation: Count, problem: Count, implication: Count, needPayoff: Count }).optional(),
  buyingSignals: List(6).optional(),
  riskSignals: List(6).optional(),
  nextQuestions: List(6).optional(),
  focus: z.array(z.object({ skill: Str(80), why: Str(240), drill: Str(300), sayThis: Str(300) })).transform((a) => a.slice(0, 2)).optional(),
  straightLine: StraightLine.optional(),
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
    scores: obj({ rapport: SLNUM, intelligence: SLNUM, control: SLNUM, threeTens: SLNUM, looping: SLNUM, closing: SLNUM }),
    checks: { type: 'array', items: obj({ id: { type: 'string', enum: STRAIGHT_LINE_CHECKS.map((c) => c.id) }, result: { type: 'string', enum: ['yes', 'no', 'na'] }, evidence: { type: ['string', 'null'] } }) },
    lessons: { type: 'array', items: obj({ ep: NUM, startSec: NUM, why: STR }) },
  }),
  moments: { type: 'array', items: obj({ at: { type: ['number', 'null'] }, clientSaid: { type: ['string', 'null'] }, repSaid: STR, better: STR, why: STR }) },
})

const SPEAKER_PROMPT = `You label who is speaking in a phone call transcript between a salesperson at Igani ("rep") and a client
("client"). Return one label per segment, in order. Use the content: the rep introduces Igani, asks about the client's
business, explains what Igani builds, proposes next steps; the client describes their business, needs and concerns.
Speakers alternate often but not always. Return JSON matching the schema.`

const PROMPT = `You are a senior sales coach reviewing one recorded call by a salesperson ("rep") at Igani with a prospect or
client ("client"). You get the transcript (segments with timestamps and speakers) and metrics MEASURED from the recording.
Trust the measured metrics over your own impression; refer to them in your coaching where they matter.

${PLAYBOOK}

${STRAIGHT_LINE_PLAYBOOK}

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
- scores: 1–5 per the rubric (opening, discovery, listening, value, objections, closing). Be calibrated: 3 is solid,
  5 is rare. Use the measured talk ratio, monologue and question metrics when scoring discovery and listening.
- qualification: for each item, covered / partly / missing / not_expected (for this stage) and a short note on what
  was learned or what's missing.
- spin: how many of the rep's questions were situation, problem, implication and need-payoff questions.
- buyingSignals / riskSignals: short, specific, from this call (empty if none).
- strengths (2–4, first one = the best moment) and improvements (2–4): specific to this call, quote it.
- focus: the 1–2 changes that would most improve the next call: skill, why it matters, a short drill, and sayThis:
  the exact words to try next time, in the call's language.
- nextQuestions: 3–5 questions the rep should ask next time (in the call's language) to fill the gaps.
- straightLine: coach the call against the Straight Line method above. scores: 1 to 5 per skill, or null when it does not apply
  (voicemail, support, nothing to judge). checks: one entry for EVERY check id, result yes / no / na, with a short evidence quote
  or null. lessons: 0 to 3 lessons from the LESSON INDEX that would help this rep most, as { ep, startSec, why } where why says in one
  sentence what in THIS call the lesson addresses. Do not coach deceptive or pressuring lines.
- moments: up to 3 coaching moments: at (seconds), clientSaid (or null), repSaid (verbatim), better (same language),
  why (one sentence in English).
Write in English except quotes and suggested lines, which stay in the call's language. Never invent facts. No markdown,
no em dashes.`

async function transcribe(audio: Blob, key: string): Promise<{ text: string; segments: { start: number; end: number; text: string }[] }> {
  const form = new FormData()
  form.append('file', audio, 'call.mp3')
  form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1')
  form.append('response_format', 'verbose_json')
  form.append('timestamp_granularities[]', 'segment')
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(240_000) })
  if (!res.ok) throw new Error(res.status === 429 ? 'OpenAI is busy or out of credit.' : `Transcription failed (${res.status}).`)
  const body = (await res.json()) as { text?: string; segments?: { start: number; end: number; text: string }[] }
  const segments = (body.segments ?? []).map((s) => ({ start: Math.max(0, s.start), end: Math.max(0, s.end), text: s.text.trim() })).filter((s) => s.text)
  return { text: body.text ?? segments.map((s) => s.text).join(' '), segments }
}

async function chat(key: string, system: string, user: string, name: string, schema: object, effort: 'low' | 'medium'): Promise<unknown> {
  const model = process.env.OPENAI_CALL_MODEL || process.env.OPENAI_OFFER_MODEL || 'gpt-5.5'
  const reasoning = /^(gpt-5|o\d)/.test(model)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
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

/**
 * Two passes: (1) who said each line, (2) metrics measured from the timestamps, then the coaching analysis with those
 * numbers in hand. The score is the rubric average (consistent from call to call), not the model's own number.
 */
export async function analyseSegments(segments: { start: number; end: number; text: string }[], key: string, context = 'Outgoing call: the rep called the client.'): Promise<{ speakers: ('rep' | 'client')[]; analysis: CallAnalysis }> {
  const numbered = segments.map((s, i) => `[${i}] (${mmss(s.start)}) ${s.text}`).join('\n')
  const voicemail = /^Voicemail/.test(context)
  const sp = voicemail ? { speakers: segments.map(() => 'client') } : ((await chat(key, SPEAKER_PROMPT, `${context}\n${numbered}`, 'speakers', SPEAKER_SCHEMA, 'low')) as { speakers?: unknown })
  const speakers = segments.map((_, i) => ((Array.isArray(sp.speakers) ? sp.speakers[i] : null) === 'client' ? 'client' : 'rep') as 'rep' | 'client')
  const lines: TranscriptSeg[] = segments.map((s, i) => ({ ...s, speaker: speakers[i]! }))
  const metrics = computeMetrics(lines)
  const measured = metrics
    ? `Measured from the recording: rep talk ${metrics.talkRatioRep}% (rep ${mmss(metrics.repSeconds)}, client ${mmss(metrics.clientSeconds)}); longest rep monologue ${mmss(metrics.longestMonologueSec)}${metrics.longestMonologueAt != null ? ` at ${mmss(metrics.longestMonologueAt)}` : ''}; longest client stretch ${mmss(metrics.longestClientStretchSec)}; rep questions ${metrics.repQuestions} (by third of the call: ${metrics.questionSpread.join(' / ')}); speaker switches ${metrics.switchesPerMin}/min.`
    : 'Metrics: not enough speech to measure.'
  const transcript = lines.map((l, i) => `[${i}] (${mmss(l.start)}, ${Math.round(l.start)}s) ${l.speaker.toUpperCase()}: ${l.text}`).join('\n')
  const raw = (await chat(key, PROMPT, `${context}\n${measured}\n\nTranscript:\n${transcript}`, 'call_analysis', ANALYSIS_SCHEMA, 'medium')) as Record<string, unknown>
  const analysis = CallAnalysis.parse({ ...raw, v: 2, talkRatioRep: metrics?.talkRatioRep ?? 50, questionsAsked: metrics?.repQuestions ?? 0, overallScore: 0, metrics: metrics ?? undefined })
  // from the validated (1–5) scores, so one odd value from the model can't skew it
  analysis.overallScore = scoreFromRubric(analysis.scores)
  return { speakers, analysis }
}

/**
 * Analyses one call's recording. Safe to call repeatedly and from several places at once: it claims the call first
 * (pending → processing), gives up after a few failed attempts, and skips recordings too short or too long.
 */
export async function analyzeCall(callId: string, opts: { force?: boolean } = {}): Promise<'ready' | 'skipped' | 'failed' | 'busy' | 'none'> {
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
  const call = await prisma.call.findUniqueOrThrow({ where: { id: callId }, select: { leadId: true, userId: true, recordingSec: true, direction: true, answeredAt: true } })
  const fail = async (status: 'failed' | 'skipped', error: string): Promise<'failed' | 'skipped'> => {
    await prisma.call.update({ where: { id: callId }, data: { analysisStatus: status, analysisError: error.slice(0, 300), analyzedAt: new Date() } })
    return status
  }
  try {
    if (call.recordingSec != null && call.recordingSec < MIN_SECONDS) return await fail('skipped', 'The recording is too short to analyse.')
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
    const { speakers, analysis } = await analyseSegments(segments.slice(0, 800), key, context)
    const transcript: TranscriptLine[] = segments.map((s, i) => ({ ...s, speaker: speakers[i] ?? 'rep' }))
    await prisma.call.update({
      where: { id: callId },
      data: { transcript: transcript as unknown as Prisma.InputJsonValue, analysis: analysis as unknown as Prisma.InputJsonValue, analysisStatus: 'ready', analyzedAt: new Date(), analysisError: null },
    })
    if (call.leadId) {
      await logActivity({ entityType: 'LEAD', entityId: call.leadId, actorId: null, action: 'call.analyzed', metadata: { callId, summary: analysis.summary.slice(0, 600), outcome: analysis.outcome.label, nextStep: analysis.nextStep } })
    }
    return 'ready'
  } catch (err) {
    console.error('[call-analysis] failed', callId, err instanceof Error ? err.message : err)
    return await fail('failed', err instanceof Error ? err.message : 'The analysis failed.')
  }
}

export const asAnalysis = (v: unknown): CallAnalysis | null => {
  const r = CallAnalysis.safeParse(v)
  return r.success ? r.data : null
}
export const asTranscript = (v: unknown): TranscriptLine[] =>
  Array.isArray(v) ? (v as TranscriptLine[]).filter((l) => l && typeof l.text === 'string' && typeof l.start === 'number').map((l) => ({ ...l, speaker: l.speaker === 'client' ? 'client' : 'rep' })) : []
