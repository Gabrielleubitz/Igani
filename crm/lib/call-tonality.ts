import 'server-only'
import { z } from 'zod'
import type { TranscriptSeg } from './call-coaching'
import { TONALITY_DIMS, type Tonality } from './call-score'

/**
 * Tonality: a model that LISTENS to the recording grades how the rep sounds (certainty, energy, care, pace, variety,
 * composure). The words are judged by the main analysis; this pass is only about the voice. Best effort: if the audio
 * model isn't available or the answer doesn't parse, the call is scored without it.
 */

/** Audio sent to the model: long calls are judged on their first part (Twilio MP3s are ~0.5 MB a minute in stereo). */
const MAX_AUDIO_BYTES = 9 * 1024 * 1024
/** Shorter than this there is no voice worth judging (a few seconds of speech). */
const MIN_AUDIO_BYTES = 16 * 1024

const Score = z.number().transform((n) => Math.max(1, Math.min(5, Math.round(n)))).nullable().catch(null)
const ToneZ = z.object({
  dims: z.object(Object.fromEntries(TONALITY_DIMS.map((d) => [d.key, Score.optional()])) as Record<(typeof TONALITY_DIMS)[number]['key'], z.ZodOptional<typeof Score>>),
  summary: z.string().catch('').transform((s) => s.trim().slice(0, 400)),
  clientMood: z.enum(['warming', 'steady', 'cooling']).nullable().catch(null),
  moments: z
    .array(z.object({ at: z.number().nullable().catch(null), note: z.string().catch(''), tryThis: z.string().nullable().catch(null) }))
    .catch([])
    .transform((a) => a.filter((m) => m.note.trim()).slice(0, 3).map((m) => ({ at: m.at == null ? null : Math.max(0, Math.round(m.at)), note: m.note.trim().slice(0, 240), tryThis: m.tryThis ? m.tryThis.trim().slice(0, 240) || null : null }))),
})

const mmss = (sec: number): string => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

const PROMPT = `You are a Control of the Call sales coach LISTENING to a recorded phone call between a salesperson at Igani ("rep") and a
client. Judge ONLY the rep's voice: how they sound, not what they say (the words are reviewed separately). The transcript with
timestamps and speakers is given only so you can tell who is who and cite moments.

Grade each dimension 1 to 5 (null if there was too little of the rep's speech to tell):
- certainty: sounds sure; statements land down, not up like questions; no hedging, apologising or nervous laughter.
- enthusiasm: energy and lift in the voice, especially the first four seconds and the company name; not flat or tired.
- warmth: sounds like they care: sincere, warm, "I'm on your side"; not salesy, cold or scripted.
- pace: comfortable speed, pauses after questions and lets the client finish; not rushed or dragging; matches the client.
- variety: tonal range and emphasis on key words, grouped phrases that sound expert; not monotone or staccato.
- composure: calm, reasonable tone under objections and when asking for commitment; no defensiveness, irritation or pushiness.
Anchors: 3 = a normal, competent phone voice. 4 = clearly good, you'd keep listening. 5 = rare, could be used to train others.
2 = noticeably hurts the call. 1 = actively damages it (mumbling, sighing, irritated, monotone reading, audible nerves).
Hebrew and English calls are judged the same way. Israeli directness is not rudeness. Phone line quality is not the rep's fault.

Also: clientMood = how the CLIENT's voice changed over the call (warming / steady / cooling). moments = up to 3 moments where the
rep's TONE helped or hurt most: at (seconds), note (what you heard), tryThis (how to say it next time, or null if it was good).
summary = one or two sentences in the teacher's voice about the rep's tonality on this call.

Reply with JSON only, no other text:
{"dims":{"certainty":n,"enthusiasm":n,"warmth":n,"pace":n,"variety":n,"composure":n},"summary":"...","clientMood":"warming|steady|cooling","moments":[{"at":n,"note":"...","tryThis":"..."}]}`

function parseJson(text: string): unknown {
  const s = text.indexOf('{')
  const e = text.lastIndexOf('}')
  if (s < 0 || e <= s) return null
  try {
    return JSON.parse(text.slice(s, e + 1))
  } catch {
    return null
  }
}

async function ask(model: string, key: string, audioB64: string, text: string): Promise<Response> {
  return fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      modalities: ['text'],
      temperature: 0.2,
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: [{ type: 'text', text }, { type: 'input_audio', input_audio: { data: audioB64, format: 'mp3' } }] },
      ],
    }),
    signal: AbortSignal.timeout(180_000),
  })
}

/** The rep's tonality from the recording, or null (no audio model, too short, or an unreadable answer). */
export async function judgeTonality(audio: Blob, lines: TranscriptSeg[], opts: { key: string; durationSec: number | null; reviewLanguage: 'he' | 'en' }): Promise<Tonality | null> {
  if (audio.size < MIN_AUDIO_BYTES) return null
  if (lines.filter((l) => l.speaker === 'rep').reduce((s, l) => s + (l.end - l.start), 0) < 15) return null
  const cut = audio.size > MAX_AUDIO_BYTES
  const clip = cut ? audio.slice(0, MAX_AUDIO_BYTES, 'audio/mpeg') : audio
  const coveredSec = cut && opts.durationSec ? Math.round(opts.durationSec * (MAX_AUDIO_BYTES / audio.size)) : null
  const shown = coveredSec ? lines.filter((l) => l.start < coveredSec) : lines
  const transcript = shown
    .slice(0, 600)
    .map((l) => `(${mmss(l.start)}, ${Math.round(l.start)}s) ${l.speaker.toUpperCase()}: ${l.text}`)
    .join('\n')
  const text = `${coveredSec ? `The audio covers the first ${mmss(coveredSec)} of the call.\n` : ''}Write summary, note and tryThis in ${opts.reviewLanguage === 'he' ? 'Hebrew' : 'English'}.\n\nTranscript:\n${transcript}`
  const b64 = Buffer.from(await clip.arrayBuffer()).toString('base64')
  const preferred = process.env.OPENAI_TONALITY_MODEL || 'gpt-audio'
  try {
    let res = await ask(preferred, opts.key, b64, text)
    if (!res.ok && [400, 403, 404].includes(res.status) && preferred !== 'gpt-4o-audio-preview') res = await ask('gpt-4o-audio-preview', opts.key, b64, text)
    if (!res.ok) {
      console.error('[call-tonality] model error', res.status, (await res.text().catch(() => '')).slice(0, 300))
      return null
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string | null } }[] }
    const parsed = ToneZ.safeParse(parseJson(body.choices?.[0]?.message?.content ?? ''))
    if (!parsed.success) return null
    const t = parsed.data
    if (!Object.values(t.dims).some((v) => typeof v === 'number')) return null
    return { ...t, coveredSec }
  } catch (err) {
    console.error('[call-tonality] failed', err instanceof Error ? err.message : err)
    return null
  }
}
