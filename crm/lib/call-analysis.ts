import 'server-only'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { logActivity } from './audit'
import { ensureRecordingSid, fetchRecordingAudio } from './call-recording'
import { prisma } from './prisma'

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

export const CallAnalysis = z.object({
  isSalesCall: z.boolean(),
  callType: Str(60),
  language: Str(20),
  summary: Str(1200),
  outcome: z.object({ label: Str(120), score: Clamp(0, 100) }),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  nextStep: z.string().nullable().transform((s) => (s ? s.trim().slice(0, 300) || null : null)),
  clientNeeds: List(8),
  objections: z.array(z.object({ objection: Str(240), response: Str(300), handledWell: z.boolean() })).transform((a) => a.slice(0, 8)),
  actionItems: z.array(z.object({ owner: z.enum(['rep', 'client']), text: Str(240) })).transform((a) => a.filter((x) => x.text).slice(0, 10)),
  talkRatioRep: Clamp(0, 100),
  questionsAsked: Clamp(0, 500),
  scores: z.object({ opening: Clamp(1, 5), discovery: Clamp(1, 5), value: Clamp(1, 5), objections: Clamp(1, 5), closing: Clamp(1, 5) }),
  overallScore: Clamp(0, 100),
  strengths: List(5),
  improvements: List(5),
  moments: z
    .array(z.object({ at: z.number().nullable(), clientSaid: z.string().nullable(), repSaid: Str(400), better: Str(400), why: Str(300) }))
    .transform((a) => a.slice(0, 5).map((m) => ({ ...m, at: m.at == null ? null : Math.max(0, Math.round(m.at)), clientSaid: m.clientSaid ? m.clientSaid.trim().slice(0, 300) : null }))),
})
export type CallAnalysis = z.infer<typeof CallAnalysis>

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['speakers', 'analysis'],
  properties: {
    speakers: { type: 'array', description: 'One entry per transcript segment, in order: who spoke it', items: { type: 'string', enum: ['rep', 'client'] } },
    analysis: {
      type: 'object',
      additionalProperties: false,
      required: ['isSalesCall', 'callType', 'language', 'summary', 'outcome', 'sentiment', 'nextStep', 'clientNeeds', 'objections', 'actionItems', 'talkRatioRep', 'questionsAsked', 'scores', 'overallScore', 'strengths', 'improvements', 'moments'],
      properties: {
        isSalesCall: { type: 'boolean' },
        callType: { type: 'string' },
        language: { type: 'string' },
        summary: { type: 'string' },
        outcome: { type: 'object', additionalProperties: false, required: ['label', 'score'], properties: { label: { type: 'string' }, score: { type: 'number' } } },
        sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
        nextStep: { type: ['string', 'null'] },
        clientNeeds: { type: 'array', items: { type: 'string' } },
        objections: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['objection', 'response', 'handledWell'], properties: { objection: { type: 'string' }, response: { type: 'string' }, handledWell: { type: 'boolean' } } } },
        actionItems: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['owner', 'text'], properties: { owner: { type: 'string', enum: ['rep', 'client'] }, text: { type: 'string' } } } },
        talkRatioRep: { type: 'number' },
        questionsAsked: { type: 'number' },
        scores: { type: 'object', additionalProperties: false, required: ['opening', 'discovery', 'value', 'objections', 'closing'], properties: { opening: { type: 'number' }, discovery: { type: 'number' }, value: { type: 'number' }, objections: { type: 'number' }, closing: { type: 'number' } } },
        overallScore: { type: 'number' },
        strengths: { type: 'array', items: { type: 'string' } },
        improvements: { type: 'array', items: { type: 'string' } },
        moments: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['at', 'clientSaid', 'repSaid', 'better', 'why'], properties: { at: { type: ['number', 'null'] }, clientSaid: { type: ['string', 'null'] }, repSaid: { type: 'string' }, better: { type: 'string' }, why: { type: 'string' } } } },
      },
    },
  },
} as const

const PROMPT = `You are a senior B2B sales coach reviewing a recorded phone call made by a salesperson ("rep") at Igani, a web
development studio (websites, booking systems, e-commerce, dashboards, automations), with a prospect or client ("client").

You get the call transcript as numbered segments with timestamps. Return JSON matching the schema:
- speakers: for EVERY segment, in order, who said it ("rep" or "client"). The rep places the call and usually speaks first after the greeting.
- analysis:
  - isSalesCall: false for voicemail, wrong number, or non-sales chats (then keep the rest short and scores at 3).
  - callType: e.g. "Discovery call", "Follow-up", "Closing call", "Voicemail".
  - language: the language spoken (e.g. "Hebrew", "English").
  - summary: 3–5 sentences, factual.
  - outcome: label (e.g. "Meeting booked", "Proposal requested", "Not interested") and score 0–100 for how good the outcome is for the sale.
  - nextStep: the concrete next step agreed, or null if none.
  - clientNeeds: what the client needs or cares about, in their terms.
  - objections: each objection, how the rep responded, and whether it was handled well.
  - actionItems: things the rep or the client committed to.
  - talkRatioRep: estimated % of talking done by the rep (0–100). Good discovery calls are around 40–55.
  - questionsAsked: number of genuine questions the rep asked.
  - scores (1–5 each): opening, discovery (needs uncovered), value (tied the offer to their needs), objections (handling), closing (secured a next step).
  - overallScore: 0–100, consistent with the rubric.
  - strengths / improvements: 2–4 each, specific to THIS call, not generic advice.
  - moments: up to 3 coaching moments. Each: at (seconds, from the segment), clientSaid (what the client said just before, or null),
    repSaid (the rep's actual words, quoted in the original language), better (what the rep could have said, in the same language),
    why (one sentence, in English, why the better version works).
Write everything in English except quotes, which stay in the call's language. Never invent facts that aren't in the transcript.
No markdown, no em dashes.`

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

export async function analyseSegments(segments: { start: number; end: number; text: string }[], key: string): Promise<{ speakers: ('rep' | 'client')[]; analysis: CallAnalysis }> {
  const model = process.env.OPENAI_CALL_MODEL || process.env.OPENAI_OFFER_MODEL || 'gpt-5.5'
  const reasoning = /^(gpt-5|o\d)/.test(model)
  const lines = segments.map((s, i) => `[${i}] (${Math.floor(s.start / 60)}:${String(Math.floor(s.start % 60)).padStart(2, '0')}, ${s.start.toFixed(0)}s) ${s.text}`).join('\n')
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      ...(reasoning ? { reasoning_effort: 'medium' } : { temperature: 0.2 }),
      response_format: { type: 'json_schema', json_schema: { name: 'call_analysis', strict: true, schema: SCHEMA } },
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: `Transcript (${segments.length} segments):\n${lines}` },
      ],
    }),
    signal: AbortSignal.timeout(240_000),
  })
  if (!res.ok) throw new Error(res.status === 429 ? 'OpenAI is busy or out of credit.' : `Analysis failed (${res.status}).`)
  const body = (await res.json()) as { choices?: { message?: { content?: string; refusal?: string } }[] }
  const msg = body.choices?.[0]?.message
  if (msg?.refusal) throw new Error('The analysis was declined.')
  const raw = JSON.parse(msg?.content ?? '{}') as { speakers?: unknown; analysis?: unknown }
  const analysis = CallAnalysis.parse(raw.analysis)
  const speakers = Array.isArray(raw.speakers) ? raw.speakers.map((s) => (s === 'client' ? 'client' : 'rep') as 'rep' | 'client') : []
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
  const call = await prisma.call.findUniqueOrThrow({ where: { id: callId }, select: { leadId: true, userId: true, recordingSec: true } })
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
    const { speakers, analysis } = await analyseSegments(segments.slice(0, 800), key)
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
